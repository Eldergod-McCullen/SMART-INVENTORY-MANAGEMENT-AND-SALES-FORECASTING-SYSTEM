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
from django.db import transaction
from django.db.models import Max

from .models import ItemType,ItemCategory,ItemSubcategory,PaymentMode,County,Town,PaymentStatus,ReceiptStatus,ShippingStatus,UserRole
from .models import Inventory,InventoryItem
from .models import Supplier,PurchaseOrder,PurchaseDetail,Payment
from .models import Customer,SalesOrder,SalesDetail,Receipt
from .models import UserManager,User


def test_page(request):
    return render(request, 'test.html')

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


# ============= INVENTORY ITEMS VIEWS =============

@login_required(login_url='/login/')
def inventory_items_content(request):
    """Load Inventory Items content"""
    return render(request, 'Inventory-items.html')


@csrf_exempt
@login_required(login_url='/login/')
def api_get_item_types(request):
    """Get all item types"""
    try:
        types = list(ItemType.objects.values_list('item_type', flat=True))
        return JsonResponse({'success': True, 'data': types})
    except Exception as e:
        return JsonResponse({'success': False, 'message': str(e)}, status=500)


@csrf_exempt
@login_required(login_url='/login/')
def api_add_item_type(request):
    """Add new item type"""
    if request.method != 'POST':
        return JsonResponse({'success': False, 'message': 'Invalid request method'}, status=405)
    
    try:
        data = json.loads(request.body)
        type_name = data.get('type_name', '').strip()
        
        if not type_name:
            return JsonResponse({'success': False, 'message': 'Item type name is required'}, status=400)
        
        # Check if already exists
        if ItemType.objects.filter(item_type=type_name).exists():
            return JsonResponse({'success': False, 'message': 'Item type already exists'}, status=400)
        
        # Create new item type
        ItemType.objects.create(item_type=type_name)
        
        return JsonResponse({'success': True, 'message': 'Item type added successfully'})
    
    except json.JSONDecodeError:
        return JsonResponse({'success': False, 'message': 'Invalid JSON data'}, status=400)
    except Exception as e:
        return JsonResponse({'success': False, 'message': str(e)}, status=500)


@csrf_exempt
@login_required(login_url='/login/')
def api_get_item_categories(request):
    """Get all item categories"""
    try:
        categories = list(ItemCategory.objects.values_list('item_category', flat=True))
        return JsonResponse({'success': True, 'data': categories})
    except Exception as e:
        return JsonResponse({'success': False, 'message': str(e)}, status=500)


@csrf_exempt
@login_required(login_url='/login/')
def api_add_item_category(request):
    """Add new item category"""
    if request.method != 'POST':
        return JsonResponse({'success': False, 'message': 'Invalid request method'}, status=405)
    
    try:
        data = json.loads(request.body)
        category_name = data.get('category_name', '').strip()
        
        if not category_name:
            return JsonResponse({'success': False, 'message': 'Item category name is required'}, status=400)
        
        # Check if already exists
        if ItemCategory.objects.filter(item_category=category_name).exists():
            return JsonResponse({'success': False, 'message': 'Item category already exists'}, status=400)
        
        # Create new item category
        ItemCategory.objects.create(item_category=category_name)
        
        return JsonResponse({'success': True, 'message': 'Item category added successfully'})
    
    except json.JSONDecodeError:
        return JsonResponse({'success': False, 'message': 'Invalid JSON data'}, status=400)
    except Exception as e:
        return JsonResponse({'success': False, 'message': str(e)}, status=500)


@csrf_exempt
@login_required(login_url='/login/')
def api_get_item_subcategories(request):
    """Get all item subcategories"""
    try:
        subcategories = list(ItemSubcategory.objects.values_list('item_subcategory', flat=True))
        return JsonResponse({'success': True, 'data': subcategories})
    except Exception as e:
        return JsonResponse({'success': False, 'message': str(e)}, status=500)


@csrf_exempt
@login_required(login_url='/login/')
def api_add_item_subcategory(request):
    """Add new item subcategory"""
    if request.method != 'POST':
        return JsonResponse({'success': False, 'message': 'Invalid request method'}, status=405)
    
    try:
        data = json.loads(request.body)
        subcategory_name = data.get('subcategory_name', '').strip()
        
        if not subcategory_name:
            return JsonResponse({'success': False, 'message': 'Item subcategory name is required'}, status=400)
        
        # Check if already exists
        if ItemSubcategory.objects.filter(item_subcategory=subcategory_name).exists():
            return JsonResponse({'success': False, 'message': 'Item subcategory already exists'}, status=400)
        
        # Create new item subcategory
        ItemSubcategory.objects.create(item_subcategory=subcategory_name)
        
        return JsonResponse({'success': True, 'message': 'Item subcategory added successfully'})
    
    except json.JSONDecodeError:
        return JsonResponse({'success': False, 'message': 'Invalid JSON data'}, status=400)
    except Exception as e:
        return JsonResponse({'success': False, 'message': str(e)}, status=500)


@csrf_exempt
@login_required(login_url='/login/')
def api_generate_item_id(request):
    """Generate unique item ID in format IT00001"""
    try:
        # Get the maximum item ID
        max_item = InventoryItem.objects.aggregate(Max('item_id'))['item_id__max']
        
        if max_item:
            # Extract numeric part and increment
            num_part = int(max_item[2:]) + 1
        else:
            num_part = 1
        
        # Format as IT00001
        new_id = f"IT{num_part:05d}"
        
        return JsonResponse({'success': True, 'item_id': new_id})
    
    except Exception as e:
        return JsonResponse({'success': False, 'message': str(e)}, status=500)


@csrf_exempt
@login_required(login_url='/login/')
def api_get_inventory_items(request):
    """Get all inventory items"""
    try:
        items = InventoryItem.objects.select_related(
            'item_type', 'item_category', 'item_subcategory'
        ).all()
        
        items_list = []
        for item in items:
            items_list.append({
                'id': item.item_id,
                'type': item.item_type.item_type,
                'category': item.item_category.item_category,
                'subcategory': item.item_subcategory.item_subcategory,
                'name': item.item_name,
                'purchase_price': float(item.purchase_price),
                'sale_price': float(item.sale_price)
            })
        
        return JsonResponse({'success': True, 'data': items_list})
    
    except Exception as e:
        return JsonResponse({'success': False, 'message': str(e)}, status=500)


@csrf_exempt
@login_required(login_url='/login/')
def api_add_inventory_item(request):
    """Add new inventory item"""
    if request.method != 'POST':
        return JsonResponse({'success': False, 'message': 'Invalid request method'}, status=405)
    
    try:
        data = json.loads(request.body)
        
        # Extract and validate data
        item_id = data.get('item_id', '').strip()
        item_type_name = data.get('item_type', '').strip()
        item_category_name = data.get('item_category', '').strip()
        item_subcategory_name = data.get('item_subcategory', '').strip()
        item_name = data.get('item_name', '').strip()
        purchase_price = data.get('purchase_price', 0)
        sale_price = data.get('sale_price', 0)
        
        # Validation
        if not all([item_id, item_type_name, item_category_name, item_subcategory_name, item_name]):
            return JsonResponse({
                'success': False, 
                'message': 'All fields are required'
            }, status=400)
        
        # Check if item ID already exists
        if InventoryItem.objects.filter(item_id=item_id).exists():
            return JsonResponse({
                'success': False, 
                'message': 'Item ID already exists'
            }, status=400)
        
        # Get foreign key objects
        try:
            item_type = ItemType.objects.get(item_type=item_type_name)
            item_category = ItemCategory.objects.get(item_category=item_category_name)
            item_subcategory = ItemSubcategory.objects.get(item_subcategory=item_subcategory_name)
        except (ItemType.DoesNotExist, ItemCategory.DoesNotExist, ItemSubcategory.DoesNotExist) as e:
            return JsonResponse({
                'success': False, 
                'message': 'Invalid type, category, or subcategory'
            }, status=400)
        
        # Create inventory item
        with transaction.atomic():
            inventory_item = InventoryItem.objects.create(
                item_id=item_id,
                item_type=item_type,
                item_category=item_category,
                item_subcategory=item_subcategory,
                item_name=item_name,
                purchase_price=purchase_price,
                sale_price=sale_price
            )
            
            # Also create corresponding Inventory record
            Inventory.objects.create(
                item_id=item_id,
                item_type=item_type,
                item_category=item_category,
                item_subcategory=item_subcategory,
                item_name=item_name,
                purchase_price=purchase_price,
                sale_price=sale_price,
                quantity_purchased=0,
                quantity_sold=0,
                reorder_level=0,
                reorder_required='NO'
            )
        
        return JsonResponse({
            'success': True, 
            'message': 'Inventory item added successfully'
        })
    
    except json.JSONDecodeError:
        return JsonResponse({'success': False, 'message': 'Invalid JSON data'}, status=400)
    except Exception as e:
        return JsonResponse({'success': False, 'message': str(e)}, status=500)


@csrf_exempt
@login_required(login_url='/login/')
def api_update_inventory_item(request):
    """Update inventory item"""
    if request.method != 'POST':
        return JsonResponse({'success': False, 'message': 'Invalid request method'}, status=405)
    
    try:
        data = json.loads(request.body)
        
        item_id = data.get('item_id', '').strip()
        item_type_name = data.get('item_type', '').strip()
        item_category_name = data.get('item_category', '').strip()
        item_subcategory_name = data.get('item_subcategory', '').strip()
        item_name = data.get('item_name', '').strip()
        purchase_price = data.get('purchase_price', 0)
        sale_price = data.get('sale_price', 0)
        
        # Get the item
        try:
            item = InventoryItem.objects.get(item_id=item_id)
        except InventoryItem.DoesNotExist:
            return JsonResponse({'success': False, 'message': 'Item not found'}, status=404)
        
        # Get foreign key objects
        try:
            item_type = ItemType.objects.get(item_type=item_type_name)
            item_category = ItemCategory.objects.get(item_category=item_category_name)
            item_subcategory = ItemSubcategory.objects.get(item_subcategory=item_subcategory_name)
        except (ItemType.DoesNotExist, ItemCategory.DoesNotExist, ItemSubcategory.DoesNotExist):
            return JsonResponse({
                'success': False, 
                'message': 'Invalid type, category, or subcategory'
            }, status=400)
        
        # Update item
        with transaction.atomic():
            item.item_type = item_type
            item.item_category = item_category
            item.item_subcategory = item_subcategory
            item.item_name = item_name
            item.purchase_price = purchase_price
            item.sale_price = sale_price
            item.save()
            
            # Also update Inventory record
            try:
                inventory = Inventory.objects.get(item_id=item_id)
                inventory.item_type = item_type
                inventory.item_category = item_category
                inventory.item_subcategory = item_subcategory
                inventory.item_name = item_name
                inventory.purchase_price = purchase_price
                inventory.sale_price = sale_price
                inventory.save()
            except Inventory.DoesNotExist:
                pass
        
        return JsonResponse({
            'success': True, 
            'message': 'Inventory item updated successfully'
        })
    
    except json.JSONDecodeError:
        return JsonResponse({'success': False, 'message': 'Invalid JSON data'}, status=400)
    except Exception as e:
        return JsonResponse({'success': False, 'message': str(e)}, status=500)


@csrf_exempt
@login_required(login_url='/login/')
def api_delete_inventory_item(request):
    """Delete inventory item"""
    if request.method != 'POST':
        return JsonResponse({'success': False, 'message': 'Invalid request method'}, status=405)
    
    try:
        data = json.loads(request.body)
        item_id = data.get('item_id', '').strip()
        
        if not item_id:
            return JsonResponse({'success': False, 'message': 'Item ID is required'}, status=400)
        
        try:
            item = InventoryItem.objects.get(item_id=item_id)
            
            # Check if item has inventory (quantity purchased or sold)
            try:
                inventory = Inventory.objects.get(item_id=item_id)
                if inventory.quantity_purchased > 0 or inventory.quantity_sold > 0:
                    return JsonResponse({
                        'success': False, 
                        'message': 'Cannot delete item with existing inventory transactions'
                    }, status=400)
            except Inventory.DoesNotExist:
                pass
            
            # Delete both records
            with transaction.atomic():
                Inventory.objects.filter(item_id=item_id).delete()
                item.delete()
            
            return JsonResponse({
                'success': True, 
                'message': 'Inventory item deleted successfully'
            })
        
        except InventoryItem.DoesNotExist:
            return JsonResponse({'success': False, 'message': 'Item not found'}, status=404)
    
    except json.JSONDecodeError:
        return JsonResponse({'success': False, 'message': 'Invalid JSON data'}, status=400)
    except Exception as e:
        return JsonResponse({'success': False, 'message': str(e)}, status=500)