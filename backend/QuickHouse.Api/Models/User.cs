namespace QuickHouse.Api.Models;

public class User
{
    public int Id { get; set; }

    public string UserName { get; set; } = string.Empty;

    public string Gender { get; set; } = string.Empty;

    public string Contact { get; set; } = string.Empty;

    public DateTime AddedTime { get; set; }
}

