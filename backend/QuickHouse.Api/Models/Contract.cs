namespace QuickHouse.Api.Models;

public class Contract
{
    public int Id { get; set; }

    public string CommunityName { get; set; } = string.Empty;

    public string LandlordName { get; set; } = string.Empty;

    public string LandlordContact { get; set; } = string.Empty;

    public string TenantName { get; set; } = string.Empty;

    public string TenantContact { get; set; } = string.Empty;

    public string Location { get; set; } = string.Empty;

    public decimal ContractPrice { get; set; }

    public string Building { get; set; } = string.Empty;

    public string Unit { get; set; } = string.Empty;

    public string Floor { get; set; } = string.Empty;

    /// <summary>Comma-separated image paths (can copy from house or override).</summary>
    public string HouseImages { get; set; } = string.Empty;

    public DateTime SignedAt { get; set; }

    public int HouseId { get; set; }

    public House House { get; set; } = null!;
}
