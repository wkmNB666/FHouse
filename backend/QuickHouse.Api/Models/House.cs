namespace QuickHouse.Api.Models;

public class House
{
    public int Id { get; set; }

    public string CommunityName { get; set; } = string.Empty;

    public int HouseAge { get; set; }

    public decimal Price { get; set; }

    public DateTime ListedTime { get; set; }
}

