namespace QuickHouse.Api.Models;

public class User
{
    public int Id { get; set; }

    public string UserName { get; set; } = string.Empty;

    /// <summary>Hashed password for login.</summary>
    public string PasswordHash { get; set; } = string.Empty;

    public string Gender { get; set; } = string.Empty;

    public string Contact { get; set; } = string.Empty;

    public DateTime AddedTime { get; set; }

    public int? RoleId { get; set; }

    public Role? Role { get; set; }

    /// <summary>Display name for header/settings.</summary>
    public string? RealName { get; set; }
}
