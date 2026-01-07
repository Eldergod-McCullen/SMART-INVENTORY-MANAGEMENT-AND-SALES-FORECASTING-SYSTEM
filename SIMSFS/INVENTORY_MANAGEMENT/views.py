from django.shortcuts import render, redirect
from django.http import JsonResponse
from django.http import HttpRequest                                     # IMPORTS FOR HTTP REQUESTS AND RESPONSES
from django.http import HttpResponse
from django.views.decorators.csrf import csrf_exempt, ensure_csrf_cookie
from django.contrib import messages                                     # IMPORTS FOR DISPLAYING MESSAGES TO THE USER
from django.contrib.auth.decorators import login_required
from django.contrib.auth.hashers import make_password
from django.contrib.auth import authenticate, login, logout
from django.db.models import Q                                          # IMPORTS FOR COMPLEX QUERIES
import json                                                             # REMEMBER TO REVIEW THIS GUY AT THE ENDPOINTS

from .models import ItemType,ItemCategory,ItemSubcategory,PaymentMode,County,Town,PaymentStatus,ReceiptStatus,ShippingStatus,UserRole
from .models import Inventory,InventoryItem
from .models import Supplier,PurchaseOrder,PurchaseDetail,Payment
from .models import Customer,SalesOrder,SalesDetail,Receipt
from .models import UserManager,User

# ============= AUTHENTICATION VIEWS =============

@ensure_csrf_cookie
def login_view(request):
    """Handle both login form display and login processing"""
    print("Login view called!")  
    print("Method:", request.method) 
    
    if request.user.is_authenticated:
        return redirect('index')
    
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            email = data.get('email', '').strip().lower()
            password = data.get('password', '').strip()
            
            # Validate inputs
            if not email or not password:
                return JsonResponse({
                    'success': False,
                    'message': 'Email and password are required'
                }, status=400)
            
            # Find user by email
            try:
                user = User.objects.get(email=email)
            except User.DoesNotExist:
                return JsonResponse({
                    'success': False,
                    'message': 'Invalid email or password'
                }, status=401)
            
            # Check password
            if not user.check_password(password):
                return JsonResponse({
                    'success': False,
                    'message': 'Invalid email or password'
                }, status=401)
            
            # Check if user is active
            if not user.is_active:
                return JsonResponse({
                    'success': False,
                    'message': 'Account is inactive. Please contact administrator.'
                }, status=403)
            
            # Login the user
            login(request, user)
            
            return JsonResponse({
                'success': True,
                'message': 'Login successful',
                'username': user.full_name,
                'redirect_url': '/'
            })
            
        except json.JSONDecodeError:
            return JsonResponse({
                'success': False,
                'message': 'Invalid request format'
            }, status=400)
        except Exception as e:
            return JsonResponse({
                'success': False,
                'message': f'An error occurred: {str(e)}'
            }, status=500)
    
    # GET request - show login form
    return render(request, 'Log-in_Register.html')


def register_view(request):
    """Handle user registration"""
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            
            # Extract and validate data
            full_name = data.get('full_name', '').strip()
            email = data.get('email', '').strip().lower()
            phone_number = data.get('phone_number', '').strip()
            password = data.get('password', '').strip()
            role = data.get('role', '').strip()
            
            # Validation
            if not full_name or len(full_name) < 2:
                return JsonResponse({
                    'success': False,
                    'message': 'Full name must be at least 2 characters'
                }, status=400)
            
            if not email or '@' not in email:
                return JsonResponse({
                    'success': False,
                    'message': 'Please provide a valid email address'
                }, status=400)
            
            if not phone_number or len(phone_number) < 10:
                return JsonResponse({
                    'success': False,
                    'message': 'Please provide a valid 10-digit phone number'
                }, status=400)
            
            if not password or len(password) < 6:
                return JsonResponse({
                    'success': False,
                    'message': 'Password must be at least 6 characters'
                }, status=400)
            
            if not role:
                return JsonResponse({
                    'success': False,
                    'message': 'Please select a role'
                }, status=400)
            
            # Check if email already exists
            if User.objects.filter(email=email).exists():
                return JsonResponse({
                    'success': False,
                    'message': 'Email already registered'
                }, status=400)
            
            # Get or create UserRole
            user_role, created = UserRole.objects.get_or_create(user_role=role)
            
            # Create user
            user = User.objects.create(
                email=email,
                full_name=full_name,
                phone_number=phone_number,
                user_role=user_role,
                is_active=True
            )
            user.set_password(password)
            user.save()
            
            return JsonResponse({
                'success': True,
                'message': 'Registration successful! Please login.',
                'redirect_url': '/login/'
            })
            
        except json.JSONDecodeError:
            return JsonResponse({
                'success': False,
                'message': 'Invalid request format'
            }, status=400)
        except Exception as e:
            return JsonResponse({
                'success': False,
                'message': f'Registration failed: {str(e)}'
            }, status=500)
    
    return JsonResponse({
        'success': False,
        'message': 'Invalid request method'
    }, status=405)


def logout_view(request):
    """Handle user logout"""
    logout(request)
    return redirect('login')


# ============= MAIN APPLICATION VIEWS =============

@login_required(login_url='/login/')
def index(request):
    """Main view that renders the Index.html with sidebar navigation"""
    context = {
        'username': request.user.full_name
    }
    return render(request, 'Index.html', context)


# ============= DYNAMIC CONTENT VIEWS =============

@login_required(login_url='/login/')
def dashboard_content(request):
    """Load Dashboard content"""
    context = {}
    return render(request, 'Dashboard.html', context)


@login_required(login_url='/login/')
def inventory_items_content(request):
    """Load Inventory Items content"""
    inventory_items = InventoryItem.objects.all()
    context = {'inventory_items': inventory_items}
    return render(request, 'Inventory-items.html', context)


@login_required(login_url='/login/')
def inventory_content(request):
    """Load Inventory content"""
    inventory = Inventory.objects.all()
    context = {'inventory': inventory}
    return render(request, 'Inventory.html', context)


@login_required(login_url='/login/')
def suppliers_content(request):
    """Load Suppliers content"""
    suppliers = Supplier.objects.all()
    context = {'suppliers': suppliers}
    return render(request, 'Suppliers.html', context)


@login_required(login_url='/login/')
def customers_content(request):
    """Load Customers content"""
    customers = Customer.objects.all()
    context = {'customers': customers}
    return render(request, 'Customers.html', context)


@login_required(login_url='/login/')
def purchases_content(request):
    """Load Purchases content"""
    purchase_orders = PurchaseOrder.objects.all()
    context = {'purchase_orders': purchase_orders}
    return render(request, 'Purchases.html', context)


@login_required(login_url='/login/')
def sales_content(request):
    """Load Sales content"""
    sales_orders = SalesOrder.objects.all()
    context = {'sales_orders': sales_orders}
    return render(request, 'Sales.html', context)


@login_required(login_url='/login/')
def receipts_content(request):
    """Load Receipts content"""
    receipts = Receipt.objects.all()
    context = {'receipts': receipts}
    return render(request, 'Receipts.html', context)


@login_required(login_url='/login/')
def payments_content(request):
    """Load Payments content"""
    payments = Payment.objects.all()
    context = {'payments': payments}
    return render(request, 'Payments.html', context)


@login_required(login_url='/login/')
def reports_content(request):
    """Load Reports content"""
    context = {}
    return render(request, 'Reports.html', context)


@login_required(login_url='/login/')
def forecasting_content(request):
    """Load Forecasting content"""
    context = {}
    return render(request, 'Forecasting.html', context)


@login_required(login_url='/login/')
def settings_content(request):
    """Load Settings content"""
    context = {}
    return render(request, 'Settings.html', context)


# ============= API ENDPOINTS =============

@csrf_exempt
@login_required(login_url='/login/')
def api_get_inventory(request):
    """API endpoint to get inventory items"""
    items = Inventory.objects.all().values()
    return JsonResponse(list(items), safe=False)


@csrf_exempt
@login_required(login_url='/login/')
def api_save_inventory(request):
    """API endpoint to save inventory"""
    if request.method == 'POST':
        data = json.loads(request.body)
        # Process and save data
        return JsonResponse({'status': 'success'})
    return JsonResponse({'status': 'error'}, status=405)
