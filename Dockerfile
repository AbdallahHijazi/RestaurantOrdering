FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src

COPY . .

RUN dotnet restore "src/RestaurantOrdering.Api/RestaurantOrdering.Api.csproj"
RUN dotnet publish "src/RestaurantOrdering.Api/RestaurantOrdering.Api.csproj" -c Release -o /app/publish /p:UseAppHost=false

FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS final
WORKDIR /app

COPY --from=build /app/publish .

ENTRYPOINT dotnet RestaurantOrdering.Api.dll --urls http://0.0.0.0:${PORT:-8080}