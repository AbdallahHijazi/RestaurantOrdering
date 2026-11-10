using MediatR;
using RestaurantOrdering.Application.Features.Auth.DTOs;

namespace RestaurantOrdering.Application.Features.Auth.Commands.Login;

public sealed record LoginCommand(string Email, string Password) : IRequest<LoginResultDto>;

