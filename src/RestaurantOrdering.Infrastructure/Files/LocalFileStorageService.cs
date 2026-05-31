using System.Text;
using Microsoft.Extensions.Options;
using RestaurantOrdering.Application.Common.Interfaces;
using RestaurantOrdering.Application.Common.Models;

namespace RestaurantOrdering.Infrastructure.Files;

public sealed class LocalFileStorageService : IFileStorageService
{
    private const int CopyBufferSize = 81920;
    private const int MaxOriginalFileNameLength = 255;

    private static readonly Dictionary<string, string> ExtensionToContentType =
        new(StringComparer.OrdinalIgnoreCase)
        {
            [".jpg"] = "image/jpeg",
            [".jpeg"] = "image/jpeg",
            [".png"] = "image/png",
            [".webp"] = "image/webp"
        };

    private readonly FileStorageOptions _options;
    private readonly string _resolvedRootPath;

    public LocalFileStorageService(
        IOptions<FileStorageOptions> options,
        string contentRootPath)
    {
        _options = options.Value;
        _resolvedRootPath = ResolveRootPath(_options.RootPath, contentRootPath);
    }

    public async Task<FileStorageResult> SaveAsync(
        Stream content,
        FileStorageRequest request,
        CancellationToken cancellationToken)
    {
        ValidateSaveRequest(content, request);
        ValidateRawOriginalFileName(request.OriginalFileName);

        var sanitizedOriginalFileName = SanitizeOriginalFileName(request.OriginalFileName);
        var extension = GetValidatedExtension(sanitizedOriginalFileName);
        ValidateContentType(request.ContentType, extension);

        var restaurantDirectory = GetRestaurantDirectory(request.RestaurantId);
        Directory.CreateDirectory(restaurantDirectory);

        var storedFileName = $"{Guid.NewGuid():N}{extension}";
        var tempFilePath = Path.Combine(restaurantDirectory, $"{storedFileName}.tmp");
        var finalFilePath = Path.Combine(restaurantDirectory, storedFileName);

        try
        {
            var actualFileSizeBytes = await CopyStreamWithSizeLimitAsync(
                content,
                tempFilePath,
                cancellationToken);

            if (actualFileSizeBytes == 0)
            {
                TryDeleteFile(tempFilePath);
                throw new ArgumentException("File is empty.");
            }

            File.Move(tempFilePath, finalFilePath, overwrite: true);

            var publicBasePath = _options.PublicBasePath.TrimEnd('/');
            var fileUrl = $"{publicBasePath}/{request.RestaurantId:N}/{storedFileName}";

            return new FileStorageResult
            {
                StoredFileName = storedFileName,
                FileUrl = fileUrl,
                SanitizedOriginalFileName = sanitizedOriginalFileName,
                ContentType = request.ContentType.Trim(),
                ActualFileSizeBytes = actualFileSizeBytes
            };
        }
        catch
        {
            TryDeleteFile(tempFilePath);
            throw;
        }
    }

    public Task DeleteAsync(
        Guid restaurantId,
        string storedFileName,
        CancellationToken cancellationToken)
    {
        cancellationToken.ThrowIfCancellationRequested();

        if (restaurantId == Guid.Empty)
        {
            throw new ArgumentException("Restaurant ID is required.", nameof(restaurantId));
        }

        if (string.IsNullOrWhiteSpace(storedFileName))
        {
            throw new ArgumentException("Stored file name is required.", nameof(storedFileName));
        }

        ValidateStoredFileName(storedFileName);

        var restaurantDirectory = GetRestaurantDirectory(restaurantId);
        var filePath = Path.Combine(restaurantDirectory, storedFileName);
        EnsurePathWithinDirectory(filePath, restaurantDirectory);

        if (File.Exists(filePath))
        {
            File.Delete(filePath);
        }

        return Task.CompletedTask;
    }

    private void ValidateSaveRequest(Stream content, FileStorageRequest request)
    {
        if (content is null)
        {
            throw new ArgumentNullException(nameof(content));
        }

        if (!content.CanRead)
        {
            throw new ArgumentException("Content stream is not readable.", nameof(content));
        }

        if (request.RestaurantId == Guid.Empty)
        {
            throw new ArgumentException("Restaurant ID is required.", nameof(request));
        }

        if (string.IsNullOrWhiteSpace(request.OriginalFileName))
        {
            throw new ArgumentException("Original file name is required.", nameof(request));
        }

        if (string.IsNullOrWhiteSpace(request.ContentType))
        {
            throw new ArgumentException("Content type is required.", nameof(request));
        }

        if (request.DeclaredFileSizeBytes <= 0)
        {
            throw new ArgumentException("Declared file size must be greater than zero.", nameof(request));
        }

        if (request.DeclaredFileSizeBytes > _options.MaxFileSizeBytes)
        {
            throw new ArgumentException(
                $"Declared file size exceeds the maximum allowed size of {_options.MaxFileSizeBytes} bytes.",
                nameof(request));
        }
    }

    private string GetValidatedExtension(string sanitizedOriginalFileName)
    {
        var extension = Path.GetExtension(sanitizedOriginalFileName).ToLowerInvariant();

        if (string.IsNullOrWhiteSpace(extension)
            || !_options.AllowedExtensions.Contains(extension, StringComparer.OrdinalIgnoreCase))
        {
            throw new ArgumentException("File extension is not allowed.");
        }

        return extension;
    }

    private void ValidateContentType(string contentType, string extension)
    {
        var normalizedContentType = contentType.Trim();

        if (!_options.AllowedContentTypes.Contains(normalizedContentType, StringComparer.OrdinalIgnoreCase))
        {
            throw new ArgumentException("Content type is not allowed.");
        }

        if (!ExtensionToContentType.TryGetValue(extension, out var expectedContentType)
            || !string.Equals(normalizedContentType, expectedContentType, StringComparison.OrdinalIgnoreCase))
        {
            throw new ArgumentException("File extension and content type do not match.");
        }
    }

    private static void ValidateRawOriginalFileName(string originalFileName)
    {
        if (ContainsPathTraversalCharacters(originalFileName))
        {
            throw new ArgumentException(
                "Original file name must not contain path traversal characters.",
                nameof(originalFileName));
        }
    }

    internal static string SanitizeOriginalFileName(string originalFileName)
    {
        var fileName = Path.GetFileName(originalFileName);

        if (ContainsPathTraversalCharacters(fileName))
        {
            throw new ArgumentException("Original file name contains invalid path characters.");
        }

        var invalidChars = Path.GetInvalidFileNameChars();
        var builder = new StringBuilder(fileName.Length);

        foreach (var character in fileName)
        {
            builder.Append(invalidChars.Contains(character) ? '_' : character);
        }

        var sanitized = builder.ToString().Trim();

        if (string.IsNullOrWhiteSpace(sanitized) || ContainsPathTraversalCharacters(sanitized))
        {
            throw new ArgumentException("Original file name is invalid after sanitization.");
        }

        if (sanitized.Length <= MaxOriginalFileNameLength)
        {
            return sanitized;
        }

        var extension = Path.GetExtension(sanitized);
        var baseName = Path.GetFileNameWithoutExtension(sanitized);
        var maxBaseLength = MaxOriginalFileNameLength - extension.Length;

        if (maxBaseLength < 1)
        {
            return sanitized[..MaxOriginalFileNameLength];
        }

        return baseName[..maxBaseLength] + extension;
    }

    private async Task<long> CopyStreamWithSizeLimitAsync(
        Stream content,
        string destinationPath,
        CancellationToken cancellationToken)
    {
        await using var destinationStream = new FileStream(
            destinationPath,
            FileMode.Create,
            FileAccess.Write,
            FileShare.None,
            CopyBufferSize,
            useAsync: true);

        var buffer = new byte[CopyBufferSize];
        long totalBytes = 0;

        while (true)
        {
            cancellationToken.ThrowIfCancellationRequested();

            var bytesRead = await content.ReadAsync(buffer, cancellationToken);
            if (bytesRead == 0)
            {
                break;
            }

            totalBytes += bytesRead;

            if (totalBytes > _options.MaxFileSizeBytes)
            {
                throw new ArgumentException(
                    $"File size exceeds the maximum allowed size of {_options.MaxFileSizeBytes} bytes.");
            }

            await destinationStream.WriteAsync(buffer.AsMemory(0, bytesRead), cancellationToken);
        }

        return totalBytes;
    }

    private string GetRestaurantDirectory(Guid restaurantId)
    {
        var restaurantDirectory = Path.Combine(_resolvedRootPath, restaurantId.ToString("N"));
        EnsurePathWithinDirectory(restaurantDirectory, _resolvedRootPath);
        return restaurantDirectory;
    }

    private static string ResolveRootPath(string configuredRootPath, string contentRootPath)
    {
        if (string.IsNullOrWhiteSpace(configuredRootPath))
        {
            throw new InvalidOperationException("FileStorage:RootPath is required.");
        }

        return Path.IsPathFullyQualified(configuredRootPath)
            ? Path.GetFullPath(configuredRootPath)
            : Path.GetFullPath(Path.Combine(contentRootPath, configuredRootPath));
    }

    private static void ValidateStoredFileName(string storedFileName)
    {
        if (Path.GetFileName(storedFileName) != storedFileName || ContainsPathTraversalCharacters(storedFileName))
        {
            throw new ArgumentException("Stored file name is invalid.", nameof(storedFileName));
        }
    }

    private static bool ContainsPathTraversalCharacters(string value) =>
        value.Contains("..", StringComparison.Ordinal)
        || value.Contains('/', StringComparison.Ordinal)
        || value.Contains('\\', StringComparison.Ordinal);

    private static void EnsurePathWithinDirectory(string targetPath, string directoryPath)
    {
        var normalizedTargetPath = Path.GetFullPath(targetPath);
        var normalizedDirectoryPath = Path.GetFullPath(directoryPath);

        var directoryPrefix = normalizedDirectoryPath.EndsWith(Path.DirectorySeparatorChar)
            ? normalizedDirectoryPath
            : normalizedDirectoryPath + Path.DirectorySeparatorChar;

        if (!normalizedTargetPath.StartsWith(directoryPrefix, StringComparison.OrdinalIgnoreCase))
        {
            throw new InvalidOperationException("Resolved file path is outside the allowed storage directory.");
        }
    }

    private static void TryDeleteFile(string filePath)
    {
        if (File.Exists(filePath))
        {
            File.Delete(filePath);
        }
    }
}
