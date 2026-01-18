from django.test import TestCase
from .models import PurchaseDetail, SalesDetail
from django.db.models import Max

# Create your tests here.

# ========== DIAGNOSTIC SCRIPT FOR DETAIL ID GENERATION ==========



def test_detail_id_generation():
    """
    Test the Detail ID generation logic
    This shows what Detail IDs exist and what the next one should be
    """
    
    print("\n" + "="*60)
    print("DETAIL ID GENERATION DIAGNOSTIC")
    print("="*60)
    
    # Get all existing Detail IDs from both tables
    purchase_details = PurchaseDetail.objects.all().values_list('detail_id', flat=True).order_by('detail_id')
    sales_details = SalesDetail.objects.all().values_list('detail_id', flat=True).order_by('detail_id')
    
    print(f"\n📦 PURCHASE DETAILS ({len(purchase_details)} records):")
    for detail_id in purchase_details:
        print(f"  - {detail_id}")
    
    print(f"\n🛒 SALES DETAILS ({len(sales_details)} records):")
    for detail_id in sales_details:
        print(f"  - {detail_id}")
    
    # Get the maximum from each table
    max_purchase = PurchaseDetail.objects.aggregate(Max('detail_id'))['detail_id__max']
    max_sales = SalesDetail.objects.aggregate(Max('detail_id'))['detail_id__max']
    
    print(f"\n📊 MAXIMUM VALUES:")
    print(f"  Purchase Max: {max_purchase}")
    print(f"  Sales Max:    {max_sales}")
    
    # Calculate what the next Detail ID should be
    max_details = [max_purchase, max_sales]
    max_details = [d for d in max_details if d is not None]
    
    if max_details:
        max_nums = [int(d[1:]) for d in max_details]
        next_num = max(max_nums) + 1
    else:
        next_num = 1
    
    next_detail_id = f"D{next_num:05d}"
    
    print(f"\n✅ NEXT DETAIL ID SHOULD BE: {next_detail_id}")
    print("="*60 + "\n")
    
    return next_detail_id


# ========== TEST THE API ENDPOINT ==========
def test_api_detail_id_generation():
    """
    Simulate calling the API endpoint multiple times
    """
    from django.test import Client
    
    client = Client()
    
    print("\n" + "="*60)
    print("TESTING API ENDPOINT - 5 CONSECUTIVE CALLS")
    print("="*60 + "\n")
    
    for i in range(1, 6):
        # For Purchases
        response_purchases = client.get('/api/purchases/generate-detail-id/')
        if response_purchases.status_code == 200:
            data = response_purchases.json()
            print(f"Call {i} (Purchases): {data.get('detail_id')} - Success: {data.get('success')}")
        
        # For Sales
        response_sales = client.get('/api/sales/generate-detail-id/')
        if response_sales.status_code == 200:
            data = response_sales.json()
            print(f"Call {i} (Sales):     {data.get('detail_id')} - Success: {data.get('success')}")
        
        print()
    
    print("="*60 + "\n")


# ========== RUN THE TESTS ==========
if __name__ == '__main__':
    test_detail_id_generation()
    # test_api_detail_id_generation()  # Uncomment to test API


# ========== MANUAL FIX IF NEEDED ==========
def fix_duplicate_detail_ids():
    """
    If you have duplicate Detail IDs, this will renumber them
    ⚠️ USE WITH CAUTION - BACKUP YOUR DATABASE FIRST!
    """
    print("\n⚠️  WARNING: This will renumber ALL Detail IDs!")
    confirm = input("Are you sure? Type 'YES' to continue: ")
    
    if confirm != 'YES':
        print("Cancelled.")
        return
    
    # Get all details from both tables
    all_details = []
    
    for detail in PurchaseDetail.objects.all().order_by('po_id__date', 'detail_id'):
        all_details.append(('purchase', detail))
    
    for detail in SalesDetail.objects.all().order_by('so_id__date', 'detail_id'):
        all_details.append(('sales', detail))
    
    # Sort by date
    all_details.sort(key=lambda x: x[1].date if hasattr(x[1], 'date') else x[1].po_id.date if hasattr(x[1], 'po_id') else x[1].so_id.date)
    
    # Renumber starting from D00001
    for idx, (table_type, detail) in enumerate(all_details, start=1):
        new_id = f"D{idx:05d}"
        print(f"Renumbering {table_type} {detail.detail_id} → {new_id}")
        detail.detail_id = new_id
        detail.save()
    
    print(f"\n✅ Renumbered {len(all_details)} detail records")
