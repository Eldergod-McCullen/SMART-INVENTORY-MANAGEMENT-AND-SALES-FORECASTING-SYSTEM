from django.test import TestCase
from .models import PurchaseDetail, SalesDetail
from django.db.models import Max
from django.core.management.base import BaseCommand                              # A DJANGO MANAGEMENT COMMAND FOR THE PAYMENT AND SHIPPING STATUSES
from .models import PaymentStatus, ShippingStatus
from .urls import *
from django.views.decorators.csrf import csrf_exempt, ensure_csrf_cookie
from django.contrib.auth.decorators import login_required
from django.http import JsonResponse
import time

# Create your tests here.

# ========================= DIAGNOSTIC SCRIPT FOR DETAIL ID GENERATION =================================================================================
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
    
    
    # Create a Django management command: create_initial_statuses.py
class Command(BaseCommand):
    help = 'Create initial payment and shipping statuses'

    def handle(self, *args, **kwargs):
        # Payment Statuses
        payment_statuses = ['PENDING', 'PARTIAL PAYMENT', 'COMPLETED']
        for status in payment_statuses:
            PaymentStatus.objects.get_or_create(payment_status=status)
            self.stdout.write(f'Created payment status: {status}')
        
        # Shipping Statuses
        shipping_statuses = ['PENDING', 'PROCESSING', 'DISPATCHED', 'IN TRANSIT', 'DELIVERED']
        for status in shipping_statuses:
            ShippingStatus.objects.get_or_create(shipping_status=status)
            self.stdout.write(f'Created shipping status: {status}')
        
        self.stdout.write(self.style.SUCCESS('Successfully created all statuses!'))
 
# ======================== CHECKING FOR DUPLICATE DETAIL IDS ============================================================================================================
def check_for_duplicate_detail_ids():
    """
    Run this in Django shell to check for duplicate Detail IDs
    
    Usage:
        python manage.py shell
        >>> from SIMSFS.INVENTORY_MANAGEMENT.views import check_for_duplicate_detail_ids
        >>> check_for_duplicate_detail_ids()
    """
    from django.db.models import Count
    
    print("\n" + "="*60)
    print("CHECKING FOR DUPLICATE DETAIL IDs")
    print("="*60)
    
    # Check PurchaseDetail for duplicates
    purchase_duplicates = PurchaseDetail.objects.values('detail_id').annotate(
        count=Count('detail_id')
    ).filter(count__gt=1)
    
    if purchase_duplicates:
        print("\n❌ FOUND DUPLICATES IN PURCHASE DETAILS:")
        for dup in purchase_duplicates:
            print(f"   Detail ID: {dup['detail_id']} - Count: {dup['count']}")
            
            # Show which POs have this duplicate
            records = PurchaseDetail.objects.filter(detail_id=dup['detail_id'])
            for record in records:
                print(f"      PO: {record.po_id.po_id}, Item: {record.item_name}")
    else:
        print("\n✅ NO duplicates found in Purchase Details")
    
    # Check SalesDetail for duplicates
    sales_duplicates = SalesDetail.objects.values('detail_id').annotate(
        count=Count('detail_id')
    ).filter(count__gt=1)
    
    if sales_duplicates:
        print("\n❌ FOUND DUPLICATES IN SALES DETAILS:")
        for dup in sales_duplicates:
            print(f"   Detail ID: {dup['detail_id']} - Count: {dup['count']}")
            
            # Show which SOs have this duplicate
            records = SalesDetail.objects.filter(detail_id=dup['detail_id'])
            for record in records:
                print(f"      SO: {record.so_id.so_id}, Item: {record.item_name}")
    else:
        print("\n✅ NO duplicates found in Sales Details")
    
    # Check cross-table duplicates
    all_purchase_ids = set(PurchaseDetail.objects.values_list('detail_id', flat=True))
    all_sales_ids = set(SalesDetail.objects.values_list('detail_id', flat=True))
    
    cross_duplicates = all_purchase_ids & all_sales_ids
    
    if cross_duplicates:
        print("\n❌ FOUND CROSS-TABLE DUPLICATES:")
        for detail_id in cross_duplicates:
            print(f"   Detail ID: {detail_id} exists in BOTH Purchase and Sales")
    else:
        print("\n✅ NO cross-table duplicates found")
    
    print("\n" + "="*60)
    print(f"Total Purchase Details: {PurchaseDetail.objects.count()}")
    print(f"Total Sales Details: {SalesDetail.objects.count()}")
    print(f"Unique Purchase IDs: {len(all_purchase_ids)}")
    print(f"Unique Sales IDs: {len(all_sales_ids)}")
    print("="*60 + "\n")
    
# =============================== FIXING DUPLICATE DETAIL IDS =========================================================================================================
def fix_duplicate_detail_ids():
    """
    Fix duplicate Detail IDs by renumbering all details sequentially
    
    ⚠️ WARNING: This will change Detail IDs! Backup your database first!
    
    Usage:
        python manage.py shell
        >>> from SIMSFS.INVENTORY_MANAGEMENT.views import fix_duplicate_detail_ids
        >>> fix_duplicate_detail_ids()
    """
    from django.db import transaction
    
    print("\n" + "="*60)
    print("⚠️  WARNING: FIXING DUPLICATE DETAIL IDs")
    print("="*60)
    
    confirm = input("\nThis will renumber ALL Detail IDs. Continue? (type 'YES'): ")
    
    if confirm != 'YES':
        print("❌ Cancelled.")
        return
    
    try:
        with transaction.atomic():
            # Collect all details from both tables, sorted by date
            all_details = []
            
            for detail in PurchaseDetail.objects.all().order_by('date', 'detail_id'):
                all_details.append(('purchase', detail))
            
            for detail in SalesDetail.objects.all().order_by('date', 'detail_id'):
                all_details.append(('sales', detail))
            
            # Sort by date
            all_details.sort(key=lambda x: x[1].date)
            
            # Renumber starting from D00001
            for idx, (table_type, detail) in enumerate(all_details, start=1):
                new_id = f"D{idx:05d}"
                old_id = detail.detail_id
                
                if old_id != new_id:
                    print(f"Renumbering {table_type} {old_id} → {new_id}")
                    detail.detail_id = new_id
                    detail.save()
            
            print(f"\n✅ Successfully renumbered {len(all_details)} detail records")
    
    except Exception as e:
        print(f"\n❌ ERROR: {str(e)}")
        print("Transaction rolled back - no changes made")


