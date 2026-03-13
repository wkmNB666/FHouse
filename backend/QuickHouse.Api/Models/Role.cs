namespace QuickHouse.Api.Models;

public class Role
{
    public int Id { get; set; }

    public string RoleName { get; set; } = string.Empty;

    public string Description { get; set; } = string.Empty;

    /// <summary>Comma-separated menu permissions, e.g. HouseModule,UserModule,RoleModule,ContractModule</summary>
    public string Permissions { get; set; } = string.Empty;

    public DateTime CreateTime { get; set; }

    public ICollection<User> Users { get; set; } = new List<User>();
}
