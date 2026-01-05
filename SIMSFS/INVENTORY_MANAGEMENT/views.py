from django.shortcuts import render, redirect
from django.http import JsonResponse
from django.http import HttpRequest                                     # IMPORTS FOR HTTP REQUESTS AND RESPONSES
from django.http import HttpResponse
from django.views.decorators.csrf import csrf_exempt
from django.contrib import messages                                     # IMPORTS FOR DISPLAYING MESSAGES TO THE USER
from django.contrib.auth.decorators import login_required
from django.db.models import Q                                          # IMPORTS FOR COMPLEX QUERIES
import json                                                             # REMEMBER TO REVIEW THIS GUY AT THE ENDPOINTS

from .models import ItemType,ItemCategory,ItemSubcategory,PaymentMode,County,Town,PaymentStatus,ReceiptStatus,ShippingStatus,UserRole
from .models import Inventory,InventoryItem
from .models import Supplier,PurchaseOrder,PurchaseDetail,Payment
from .models import Customer,SalesOrder,SalesDetail,Receipt
from .models import UserManager,User

# Create your views here.
# Main index view that serves the base template
def index(request):
    """
    Main view that renders the Index.html with sidebar navigation
    """
    context = {
        'username': request.user.username if request.user.is_authenticated else 'ADMIN'
    }
    return render(request, 'Index.html', context)

# Dynamic content views - these return only the content HTML
@login_required
def dashboard_content(request):
    """Load Dashboard content"""
    # Add your dashboard data logic here
    context = {}
    return render(request, 'Dashboard.html', context)

@login_required
def inventory_items_content(request):
    """Load Inventory Items content"""
     # Fetch data from database
    inventory_items = InventoryItem.objects.all()
    context = {
        'inventory_items': inventory_items,
    }
    return render(request, 'Inventory-items.html', context)

@login_required
def inventory_content(request):
    """Load Inventory content"""
    # Fetch data from database
    inventory = Inventory.objects.all()
    context = {
        'inventory': inventory,
    }
    return render(request, 'Inventory.html', context)

@login_required
def suppliers_content(request):
    """Load Suppliers content"""
     # Fetch data from database
    supplier = Supplier.objects.all()
    context = {
        'supplier': supplier,
    }
    return render(request, 'Suppliers.html', context)

@login_required
def customers_content(request):
    """Load Customers content"""
     # Fetch data from database
    customer = Customer.objects.all()
    context = {
        'customer': customer,
    }
    return render(request, 'Customers.html', context)

@login_required
def purchases_content(request):
    """Load Purchases content"""
     # Fetch data from database
    purchase_order = PurchaseOrder.objects.all()
    context = {
        'purchase_order': purchase_order,
    }
    return render(request, 'Purchases.html', context)

@login_required
def sales_content(request):
    """Load Sales content"""
    # Fetch data from database
    sales_order = SalesOrder.objects.all()
    context = {
        'sales_order': sales_order,
    }
    return render(request, 'Sales.html', context)

@login_required
def receipts_content(request):
    """Load Receipts content"""
    # Fetch data from database
    receipt = Receipt.objects.all()
    context = {
        'receipt': receipt,
    }
    return render(request, 'Receipts.html', context)

@login_required
def payments_content(request):
    """Load Payments content"""
     # Fetch data from database
    payment = Payment.objects.all()
    context = {
        'payment': payment,
    }
    return render(request, 'Payments.html', context)

@login_required
def reports_content(request):
    """Load Reports content"""
    context = {}
    return render(request, 'Reports.html', context)

@login_required
def forecasting_content(request):
    """Load Forecasting content"""
    context = {}
    return render(request, 'Forecasting.html', context)

@login_required
def settings_content(request):
    context = {}
    return render(request, 'Settings.html', context)

# Authentication views
def login_view(request):
    """Login/Register page"""
    return render(request, 'Log-in_Register.html')

def logout_view(request):
    """Logout functionality"""
    from django.contrib.auth import logout
    logout(request)
    return redirect('login')



# API ENDPOINTS
@csrf_exempt
def api_get_inventory(request):
    items = Inventory.objects.all().values()
    return JsonResponse(list(items), safe=False)

@csrf_exempt
def api_save_inventory(request):
    if request.method == 'POST':
        data = json.loads(request.body)
        # Process and save data
        return JsonResponse({'status': 'success'})
