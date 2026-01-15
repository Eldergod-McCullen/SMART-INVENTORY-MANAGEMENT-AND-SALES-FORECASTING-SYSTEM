from django.shortcuts import render, redirect
from django.http import JsonResponse
from django.http import HttpRequest                                     # IMPORTS FOR HTTP REQUESTS AND RESPONSES
from django.http import HttpResponse
from django.views.decorators.csrf import csrf_exempt, ensure_csrf_cookie
from django.contrib import messages                                     # IMPORTS FOR DISPLAYING MESSAGES TO THE USER
from django.contrib.auth.decorators import login_required
from django.contrib.auth.hashers import make_password
from django.contrib.auth import authenticate, login, logout
from django.db.models import Q, Sum, Max, F                                          # IMPORTS FOR COMPLEX QUERIES
import json                                                             # REMEMBER TO REVIEW THIS GUY AT THE ENDPOINTS
from django.db import transaction
from decimal import Decimal
from datetime import datetime

from .models import ItemType,ItemCategory,ItemSubcategory,PaymentMode,County,Town,PaymentStatus,ReceiptStatus,ShippingStatus,UserRole
from .models import Inventory,InventoryItem
from .models import Supplier,PurchaseOrder,PurchaseDetail,Payment
from .models import Customer,SalesOrder,SalesDetail,Receipt
from .models import UserManager,User


# A TEST VIEW TO SEE WHETHER THE Test.html DOCUMENT IS PERFECTLY LOADING
def test_page(request):
    return render(request, 'Test.html')

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
    # """Load Inventory Items content"""
    #inventory_items = InventoryItem.objects.all()
    #context = {'inventory_items': inventory_items}
    #return render(request, 'Inventory-items.html', context)
    """Load Inventory Items content - Returns content only, not full page"""
    return render(request, 'Inventory-items.html')

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


# =========================== INVENTORY ITEMS VIEWS ======================================================================

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
    """Delete inventory item only if no stock exists"""
    if request.method != 'POST':
        return JsonResponse({'success': False, 'message': 'Invalid request method'}, status=405)
    
    try:
        data = json.loads(request.body)
        item_id = data.get('item_id', '').strip()
        
        if not item_id:
            return JsonResponse({'success': False, 'message': 'Item ID is required'}, status=400)
        
        try:
            item = Inventory.objects.get(item_id=item_id)
            
            # Check if item has stock
            remaining_qty = item.quantity_purchased - item.quantity_sold
            if remaining_qty > 0:
                return JsonResponse({
                    'success': False,
                    'message': f'Item with stock in hand can\'t be deleted. Quantity Remaining: {remaining_qty}'
                }, status=400)
            
            # Delete from both tables
            with transaction.atomic():
                InventoryItem.objects.filter(item_id=item_id).delete()
                item.delete()
            
            return JsonResponse({
                'success': True,
                'message': 'Inventory item deleted successfully'
            })
        
        except Inventory.DoesNotExist:
            return JsonResponse({'success': False, 'message': 'Item not found'}, status=404)
    
    except json.JSONDecodeError:
        return JsonResponse({'success': False, 'message': 'Invalid JSON data'}, status=400)
    except Exception as e:
        return JsonResponse({'success': False, 'message': str(e)}, status=500)
    
# ================================= ADDED FOR THE INVENTORY MODULE ============================================
    # Get all inventory with calculated fields
@csrf_exempt
@login_required(login_url='/login/')
def api_get_inventory(request):
    """Get all inventory items with quantities and reorder status"""
    try:
        inventory_items = Inventory.objects.select_related(
            'item_type', 'item_category', 'item_subcategory'
        ).all()
        
        items_list = []
        for item in inventory_items:
            remaining_qty = item.quantity_purchased - item.quantity_sold
            reorder_required = 'YES' if remaining_qty <= item.reorder_level else 'NO'
            
            items_list.append({
                'id': item.item_id,
                'type': item.item_type.item_type,
                'category': item.item_category.item_category,
                'subcategory': item.item_subcategory.item_subcategory,
                'name': item.item_name,
                'purchasedQty': item.quantity_purchased,
                'soldQty': item.quantity_sold,
                'remainingQty': remaining_qty,
                'reorderLevel': item.reorder_level,
                'reorderRequired': reorder_required
            })
        
        return JsonResponse({'success': True, 'data': items_list})
    
    except Exception as e:
        return JsonResponse({'success': False, 'message': str(e)}, status=500)


# Update reorder level only
@csrf_exempt
@login_required(login_url='/login/')
def api_update_reorder_level(request):
    """Update only the reorder level for an inventory item"""
    if request.method != 'POST':
        return JsonResponse({'success': False, 'message': 'Invalid request method'}, status=405)
    
    try:
        data = json.loads(request.body)
        item_id = data.get('item_id', '').strip()
        reorder_level = int(data.get('reorder_level', 0))
        
        if not item_id:
            return JsonResponse({'success': False, 'message': 'Item ID is required'}, status=400)
        
        if reorder_level < 0:
            return JsonResponse({'success': False, 'message': 'Reorder level must be non-negative'}, status=400)
        
        try:
            item = Inventory.objects.get(item_id=item_id)
            item.reorder_level = reorder_level
            item.save()  # This will trigger the model's save() method to update reorder_required
            
            return JsonResponse({
                'success': True,
                'message': 'Reorder level updated successfully'
            })
        
        except Inventory.DoesNotExist:
            return JsonResponse({'success': False, 'message': 'Item not found'}, status=404)
    
    except json.JSONDecodeError:
        return JsonResponse({'success': False, 'message': 'Invalid JSON data'}, status=400)
    except ValueError:
        return JsonResponse({'success': False, 'message': 'Reorder level must be a number'}, status=400)
    except Exception as e:
        return JsonResponse({'success': False, 'message': str(e)}, status=500)


# Delete inventory item (with validation)
@csrf_exempt
@login_required(login_url='/login/')
def api_delete_inventory_item(request):
    """Delete inventory item only if no stock exists"""
    if request.method != 'POST':
        return JsonResponse({'success': False, 'message': 'Invalid request method'}, status=405)
    
    try:
        data = json.loads(request.body)
        item_id = data.get('item_id', '').strip()
        
        if not item_id:
            return JsonResponse({'success': False, 'message': 'Item ID is required'}, status=400)
        
        try:
            item = Inventory.objects.get(item_id=item_id)
            
            # Check if item has stock
            if item.quantity_purchased > 0 or item.quantity_sold > 0:
                return JsonResponse({
                    'success': False,
                    'message': 'Cannot delete item with existing stock transactions'
                }, status=400)
            
            # Delete from both tables
            with transaction.atomic():
                InventoryItem.objects.filter(item_id=item_id).delete()
                item.delete()
            
            return JsonResponse({
                'success': True,
                'message': 'Inventory item deleted successfully'
            })
        
        except Inventory.DoesNotExist:
            return JsonResponse({'success': False, 'message': 'Item not found'}, status=404)
    
    except json.JSONDecodeError:
        return JsonResponse({'success': False, 'message': 'Invalid JSON data'}, status=400)
    except Exception as e:
        return JsonResponse({'success': False, 'message': str(e)}, status=500)
    

# ===================== SUPPLIERS MODULE VIEWS =====================

@login_required(login_url='/login/')
def suppliers_content(request):
    """Load Suppliers content page"""
    return render(request, 'Suppliers.html')


# ===================== API ENDPOINTS =====================

@csrf_exempt
@login_required(login_url='/login/')
def api_get_counties(request):
    """Get all counties from database"""
    try:
        counties = list(County.objects.values_list('county', flat=True).order_by('county'))
        return JsonResponse({'success': True, 'data': counties})
    except Exception as e:
        return JsonResponse({'success': False, 'message': str(e)}, status=500)


@csrf_exempt
@login_required(login_url='/login/')
def api_get_towns(request):
    """Get all towns from database"""
    try:
        towns = list(Town.objects.values_list('town', flat=True).order_by('town'))
        return JsonResponse({'success': True, 'data': towns})
    except Exception as e:
        return JsonResponse({'success': False, 'message': str(e)}, status=500)


@csrf_exempt
@login_required(login_url='/login/')
def api_add_county(request):
    """Add new county"""
    if request.method != 'POST':
        return JsonResponse({'success': False, 'message': 'Invalid request method'}, status=405)
    
    try:
        data = json.loads(request.body)
        county_name = data.get('county_name', '').strip()
        
        if not county_name:
            return JsonResponse({'success': False, 'message': 'County name is required'}, status=400)
        
        # Check if already exists
        if County.objects.filter(county__iexact=county_name).exists():
            return JsonResponse({'success': False, 'message': 'County already exists'}, status=400)
        
        # Create new county
        County.objects.create(county=county_name)
        
        return JsonResponse({'success': True, 'message': 'County added successfully'})
    
    except json.JSONDecodeError:
        return JsonResponse({'success': False, 'message': 'Invalid JSON data'}, status=400)
    except Exception as e:
        return JsonResponse({'success': False, 'message': str(e)}, status=500)


@csrf_exempt
@login_required(login_url='/login/')
def api_add_town(request):
    """Add new town"""
    if request.method != 'POST':
        return JsonResponse({'success': False, 'message': 'Invalid request method'}, status=405)
    
    try:
        data = json.loads(request.body)
        town_name = data.get('town_name', '').strip()
        
        if not town_name:
            return JsonResponse({'success': False, 'message': 'Town name is required'}, status=400)
        
        # Check if already exists
        if Town.objects.filter(town__iexact=town_name).exists():
            return JsonResponse({'success': False, 'message': 'Town already exists'}, status=400)
        
        # Create new town
        Town.objects.create(town=town_name)
        
        return JsonResponse({'success': True, 'message': 'Town added successfully'})
    
    except json.JSONDecodeError:
        return JsonResponse({'success': False, 'message': 'Invalid JSON data'}, status=400)
    except Exception as e:
        return JsonResponse({'success': False, 'message': str(e)}, status=500)


@csrf_exempt
@login_required(login_url='/login/')
def api_generate_supplier_id(request):
    """Generate unique supplier ID in format S00001"""
    try:
        # Get the maximum supplier ID
        max_supplier = Supplier.objects.aggregate(Max('supplier_id'))['supplier_id__max']
        
        if max_supplier:
            # Extract numeric part and increment
            num_part = int(max_supplier[5:]) + 1
        else:
            num_part = 1
        
        # Format as SUP001
        new_id = f"S{num_part:05d}"
        
        # Make sure it doesn't exist (safety check)
        while Supplier.objects.filter(supplier_id=new_id).exists():
            num_part += 1
            new_id = f"S{num_part:05d}"
        
        return JsonResponse({'success': True, 'supplier_id': new_id})
    
    except Exception as e:
        return JsonResponse({'success': False, 'message': str(e)}, status=500)


@csrf_exempt
@login_required(login_url='/login/')
def api_get_suppliers(request):
    """Get all suppliers with calculated totals"""
    try:
        suppliers = Supplier.objects.select_related('county', 'town').all()
        
        suppliers_list = []
        for supplier in suppliers:
            # Calculate totals from PurchaseOrders
            purchase_totals = PurchaseOrder.objects.filter(
                supplier_id=supplier
            ).aggregate(
                total_purchases=Sum('total_amount'),
                total_payments=Sum('amount_paid')
            )
            
            total_purchases = purchase_totals['total_purchases'] or Decimal('0.00')
            total_payments = purchase_totals['total_payments'] or Decimal('0.00')
            balance = total_purchases - total_payments
            
            # Update supplier record with calculated values
            supplier.total_purchases = total_purchases
            supplier.total_payments = total_payments
            supplier.save()
            
            suppliers_list.append({
                'id': supplier.supplier_id,
                'name': supplier.supplier_name,
                'contact': supplier.phone_number or '',
                'email': supplier.email or '',
                'state': supplier.county.county if supplier.county else '',
                'city': supplier.town.town if supplier.town else '',
                'purchases': float(total_purchases),
                'payments': float(total_payments),
                'balance': float(balance)
            })
        
        return JsonResponse({'success': True, 'data': suppliers_list})
    
    except Exception as e:
        return JsonResponse({'success': False, 'message': str(e)}, status=500)


@csrf_exempt
@login_required(login_url='/login/')
def api_add_supplier(request):
    """Add new supplier"""
    if request.method != 'POST':
        return JsonResponse({'success': False, 'message': 'Invalid request method'}, status=405)
    
    try:
        data = json.loads(request.body)
        
        # Extract and validate data
        supplier_id = data.get('id', '').strip()
        supplier_name = data.get('name', '').strip()
        phone_number = data.get('contact', '').strip()
        email = data.get('email', '').strip()
        county_name = data.get('state', '').strip()
        town_name = data.get('city', '').strip()
        
        # Validation
        if not all([supplier_id, supplier_name, county_name, town_name]):
            return JsonResponse({
                'success': False, 
                'message': 'Supplier ID, Name, County, and Town are required'
            }, status=400)
        
        # Check if supplier ID already exists
        if Supplier.objects.filter(supplier_id=supplier_id).exists():
            return JsonResponse({
                'success': False, 
                'message': 'Supplier ID already exists'
            }, status=400)
        
        # Get foreign key objects
        try:
            county = County.objects.get(county=county_name)
            town = Town.objects.get(town=town_name)
        except (County.DoesNotExist, Town.DoesNotExist):
            return JsonResponse({
                'success': False, 
                'message': 'Invalid county or town'
            }, status=400)
        
        # Create supplier
        Supplier.objects.create(
            supplier_id=supplier_id,
            supplier_name=supplier_name,
            phone_number=phone_number if phone_number else None,
            email=email if email else None,
            county=county,
            town=town,
            total_purchases=Decimal('0.00'),
            total_payments=Decimal('0.00')
        )
        
        return JsonResponse({
            'success': True, 
            'message': 'Supplier added successfully'
        })
    
    except json.JSONDecodeError:
        return JsonResponse({'success': False, 'message': 'Invalid JSON data'}, status=400)
    except Exception as e:
        return JsonResponse({'success': False, 'message': str(e)}, status=500)


@csrf_exempt
@login_required(login_url='/login/')
def api_update_supplier(request):
    """Update supplier information"""
    if request.method != 'POST':
        return JsonResponse({'success': False, 'message': 'Invalid request method'}, status=405)
    
    try:
        data = json.loads(request.body)
        
        supplier_id = data.get('id', '').strip()
        supplier_name = data.get('name', '').strip()
        phone_number = data.get('contact', '').strip()
        email = data.get('email', '').strip()
        county_name = data.get('state', '').strip()
        town_name = data.get('city', '').strip()
        
        # Get the supplier
        try:
            supplier = Supplier.objects.get(supplier_id=supplier_id)
        except Supplier.DoesNotExist:
            return JsonResponse({'success': False, 'message': 'Supplier not found'}, status=404)
        
        # Get foreign key objects
        try:
            county = County.objects.get(county=county_name)
            town = Town.objects.get(town=town_name)
        except (County.DoesNotExist, Town.DoesNotExist):
            return JsonResponse({
                'success': False, 
                'message': 'Invalid county or town'
            }, status=400)
        
        # Update supplier
        supplier.supplier_name = supplier_name
        supplier.phone_number = phone_number if phone_number else None
        supplier.email = email if email else None
        supplier.county = county
        supplier.town = town
        supplier.save()
        
        return JsonResponse({
            'success': True, 
            'message': 'Supplier updated successfully'
        })
    
    except json.JSONDecodeError:
        return JsonResponse({'success': False, 'message': 'Invalid JSON data'}, status=400)
    except Exception as e:
        return JsonResponse({'success': False, 'message': str(e)}, status=500)


@csrf_exempt
@login_required(login_url='/login/')
def api_delete_supplier(request):
    """Delete supplier (only if balance is zero)"""
    if request.method != 'POST':
        return JsonResponse({'success': False, 'message': 'Invalid request method'}, status=405)
    
    try:
        data = json.loads(request.body)
        supplier_id = data.get('supplier_id', '').strip()
        
        if not supplier_id:
            return JsonResponse({'success': False, 'message': 'Supplier ID is required'}, status=400)
        
        try:
            supplier = Supplier.objects.get(supplier_id=supplier_id)
            
            # Calculate balance
            purchase_totals = PurchaseOrder.objects.filter(
                supplier_id=supplier
            ).aggregate(
                total_purchases=Sum('total_amount'),
                total_payments=Sum('amount_paid')
            )
            
            total_purchases = purchase_totals['total_purchases'] or Decimal('0.00')
            total_payments = purchase_totals['total_payments'] or Decimal('0.00')
            balance = total_purchases - total_payments
            
            # Check if balance is zero
            if balance > Decimal('0.00'):
                return JsonResponse({
                    'success': False, 
                    'message': 'Cannot delete supplier with outstanding balance. Please clear all dues first.',
                    'has_balance': True
                }, status=400)
            
            # Delete supplier
            supplier.delete()
            
            return JsonResponse({
                'success': True, 
                'message': 'Supplier deleted successfully'
            })
        
        except Supplier.DoesNotExist:
            return JsonResponse({'success': False, 'message': 'Supplier not found'}, status=404)
    
    except json.JSONDecodeError:
        return JsonResponse({'success': False, 'message': 'Invalid JSON data'}, status=400)
    except Exception as e:
        return JsonResponse({'success': False, 'message': str(e)}, status=500)
    
    
# ========================================== CUSTOMER MODULE VIEWS ================================================================================

@login_required(login_url='/login/')
def customers_content(request):
    """Load Customers content page"""
    return render(request, 'Customers.html')


# ================================================ API ENDPOINTS ====================================================================================

@csrf_exempt
@login_required(login_url='/login/')
def api_get_counties(request):
    """Get all counties from database"""
    try:
        counties = list(County.objects.values_list('county', flat=True).order_by('county'))
        return JsonResponse({'success': True, 'data': counties})
    except Exception as e:
        return JsonResponse({'success': False, 'message': str(e)}, status=500)


@csrf_exempt
@login_required(login_url='/login/')
def api_get_towns(request):
    """Get all towns from database"""
    try:
        towns = list(Town.objects.values_list('town', flat=True).order_by('town'))
        return JsonResponse({'success': True, 'data': towns})
    except Exception as e:
        return JsonResponse({'success': False, 'message': str(e)}, status=500)


@csrf_exempt
@login_required(login_url='/login/')
def api_add_county(request):
    """Add new county"""
    if request.method != 'POST':
        return JsonResponse({'success': False, 'message': 'Invalid request method'}, status=405)
    
    try:
        data = json.loads(request.body)
        county_name = data.get('county_name', '').strip()
        
        if not county_name:
            return JsonResponse({'success': False, 'message': 'County name is required'}, status=400)
        
        # Check if already exists
        if County.objects.filter(county__iexact=county_name).exists():
            return JsonResponse({'success': False, 'message': 'County already exists'}, status=400)
        
        # Create new county
        County.objects.create(county=county_name)
        
        return JsonResponse({'success': True, 'message': 'County added successfully'})
    
    except json.JSONDecodeError:
        return JsonResponse({'success': False, 'message': 'Invalid JSON data'}, status=400)
    except Exception as e:
        return JsonResponse({'success': False, 'message': str(e)}, status=500)


@csrf_exempt
@login_required(login_url='/login/')
def api_add_town(request):
    """Add new town"""
    if request.method != 'POST':
        return JsonResponse({'success': False, 'message': 'Invalid request method'}, status=405)
    
    try:
        data = json.loads(request.body)
        town_name = data.get('town_name', '').strip()
        
        if not town_name:
            return JsonResponse({'success': False, 'message': 'Town name is required'}, status=400)
        
        # Check if already exists
        if Town.objects.filter(town__iexact=town_name).exists():
            return JsonResponse({'success': False, 'message': 'Town already exists'}, status=400)
        
        # Create new town
        Town.objects.create(town=town_name)
        
        return JsonResponse({'success': True, 'message': 'Town added successfully'})
    
    except json.JSONDecodeError:
        return JsonResponse({'success': False, 'message': 'Invalid JSON data'}, status=400)
    except Exception as e:
        return JsonResponse({'success': False, 'message': str(e)}, status=500)


@csrf_exempt
@login_required(login_url='/login/')
def api_generate_customer_id(request):
    """Generate unique customer ID in format C00001"""
    try:
        # Get the maximum customer ID
        max_customer = Customer.objects.aggregate(Max('customer_id'))['customer_id__max']
        
        if max_customer:
            # Extract numeric part and increment
            # Handle both C00001 and CUST00001 formats
            if max_customer.startswith('C'):
                num_part = int(max_customer[4:]) + 1
            else:
                num_part = int(max_customer[1:]) + 1
        else:
            num_part = 1
        
        # Format as C00001
        new_id = f"C{num_part:05d}"
        
        # Make sure it doesn't exist (safety check)
        while Customer.objects.filter(customer_id=new_id).exists():
            num_part += 1
            new_id = f"C{num_part:05d}"
        
        return JsonResponse({'success': True, 'customer_id': new_id})
    
    except Exception as e:
        return JsonResponse({'success': False, 'message': str(e)}, status=500)


@csrf_exempt
@login_required(login_url='/login/')
def api_get_customers(request):
    """
    Get all customers with calculated totals
    
    Logic:
    - total_sales = Sum of all SalesOrder.total_amount for this customer
    - total_payments = Sum of all Receipt.amount_received for this customer
    - balance_receivable = total_sales - total_payments
    """
    try:
        customers = Customer.objects.select_related('county', 'town').all()
        
        customers_list = []
        for customer in customers:
            # Calculate total sales from SalesOrders
            sales_totals = SalesOrder.objects.filter(
                customer_id=customer
            ).aggregate(
                total_sales=Sum('total_amount')
            )
            
            # Calculate total payments from Receipts
            payment_totals = Receipt.objects.filter(
                customer_id=customer
            ).aggregate(
                total_payments=Sum('amount_received')
            )
            
            total_sales = sales_totals['total_sales'] or Decimal('0.00')
            total_payments = payment_totals['total_payments'] or Decimal('0.00')
            balance_receivable = total_sales - total_payments
            
            # Update customer record with calculated values
            customer.total_sales = total_sales
            customer.total_payments = total_payments
            customer.save()
            
            customers_list.append({
                'id': customer.customer_id,
                'name': customer.customer_name,
                'contact': customer.phone_number or '',
                'email': customer.email or '',
                'state': customer.county.county if customer.county else '',
                'city': customer.town.town if customer.town else '',
                'sales': float(total_sales),
                'receipts': float(total_payments),  # This is what we send to frontend
                'balance': float(balance_receivable)
            })
        
        return JsonResponse({'success': True, 'data': customers_list})
    
    except Exception as e:
        return JsonResponse({'success': False, 'message': str(e)}, status=500)


@csrf_exempt
@login_required(login_url='/login/')
def api_add_customer(request):
    """Add new customer"""
    if request.method != 'POST':
        return JsonResponse({'success': False, 'message': 'Invalid request method'}, status=405)
    
    try:
        data = json.loads(request.body)
        
        # Extract and validate data
        customer_id = data.get('id', '').strip()
        customer_name = data.get('name', '').strip()
        phone_number = data.get('contact', '').strip()
        email = data.get('email', '').strip()
        county_name = data.get('state', '').strip()
        town_name = data.get('city', '').strip()
        
        # Validation
        if not all([customer_id, customer_name, county_name, town_name]):
            return JsonResponse({
                'success': False, 
                'message': 'Customer ID, Name, County, and Town are required'
            }, status=400)
        
        # Check if customer ID already exists
        if Customer.objects.filter(customer_id=customer_id).exists():
            return JsonResponse({
                'success': False, 
                'message': 'Customer ID already exists'
            }, status=400)
        
        # Get foreign key objects
        try:
            county = County.objects.get(county=county_name)
            town = Town.objects.get(town=town_name)
        except (County.DoesNotExist, Town.DoesNotExist):
            return JsonResponse({
                'success': False, 
                'message': 'Invalid county or town'
            }, status=400)
        
        # Create customer with correct field names
        Customer.objects.create(
            customer_id=customer_id,
            customer_name=customer_name,
            phone_number=phone_number if phone_number else None,
            email=email if email else None,
            county=county,
            town=town,
            total_sales=Decimal('0.00'),
            total_payments=Decimal('0.00')  # CORRECTED: Using total_payments not total_receipts
        )
        
        return JsonResponse({
            'success': True, 
            'message': 'Customer added successfully'
        })
    
    except json.JSONDecodeError:
        return JsonResponse({'success': False, 'message': 'Invalid JSON data'}, status=400)
    except Exception as e:
        return JsonResponse({'success': False, 'message': str(e)}, status=500)


@csrf_exempt
@login_required(login_url='/login/')
def api_update_customer(request):
    """Update customer information"""
    if request.method != 'POST':
        return JsonResponse({'success': False, 'message': 'Invalid request method'}, status=405)
    
    try:
        data = json.loads(request.body)
        
        customer_id = data.get('id', '').strip()
        customer_name = data.get('name', '').strip()
        phone_number = data.get('contact', '').strip()
        email = data.get('email', '').strip()
        county_name = data.get('state', '').strip()
        town_name = data.get('city', '').strip()
        
        # Get the customer
        try:
            customer = Customer.objects.get(customer_id=customer_id)
        except Customer.DoesNotExist:
            return JsonResponse({'success': False, 'message': 'Customer not found'}, status=404)
        
        # Get foreign key objects
        try:
            county = County.objects.get(county=county_name)
            town = Town.objects.get(town=town_name)
        except (County.DoesNotExist, Town.DoesNotExist):
            return JsonResponse({
                'success': False, 
                'message': 'Invalid county or town'
            }, status=400)
        
        # Update customer
        customer.customer_name = customer_name
        customer.phone_number = phone_number if phone_number else None
        customer.email = email if email else None
        customer.county = county
        customer.town = town
        customer.save()
        
        return JsonResponse({
            'success': True, 
            'message': 'Customer updated successfully'
        })
    
    except json.JSONDecodeError:
        return JsonResponse({'success': False, 'message': 'Invalid JSON data'}, status=400)
    except Exception as e:
        return JsonResponse({'success': False, 'message': str(e)}, status=500)


@csrf_exempt
@login_required(login_url='/login/')
def api_delete_customer(request):
    """
    Delete customer (only if balance is zero)
    
    Logic:
    - Calculate total_sales from all SalesOrders
    - Calculate total_payments from all Receipts
    - If balance (total_sales - total_payments) > 0, prevent deletion
    """
    if request.method != 'POST':
        return JsonResponse({'success': False, 'message': 'Invalid request method'}, status=405)
    
    try:
        data = json.loads(request.body)
        customer_id = data.get('customer_id', '').strip()
        
        if not customer_id:
            return JsonResponse({'success': False, 'message': 'Customer ID is required'}, status=400)
        
        try:
            customer = Customer.objects.get(customer_id=customer_id)
            
            # Calculate balance from SalesOrders and Receipts
            sales_totals = SalesOrder.objects.filter(
                customer_id=customer
            ).aggregate(
                total_sales=Sum('total_amount')
            )
            
            payment_totals = Receipt.objects.filter(
                customer_id=customer
            ).aggregate(
                total_payments=Sum('amount_received')
            )
            
            total_sales = sales_totals['total_sales'] or Decimal('0.00')
            total_payments = payment_totals['total_payments'] or Decimal('0.00')
            balance_receivable = total_sales - total_payments
            
            # Check if balance is zero
            if balance_receivable > Decimal('0.00'):
                return JsonResponse({
                    'success': False, 
                    'message': f'Customer has outstanding balance of {float(balance_receivable):.2f}. Please clear all dues first.',
                    'has_balance': True,
                    'balance_amount': float(balance_receivable)
                }, status=400)
            
            # Delete customer
            customer.delete()
            
            return JsonResponse({
                'success': True, 
                'message': 'Customer deleted successfully'
            })
        
        except Customer.DoesNotExist:
            return JsonResponse({'success': False, 'message': 'Customer not found'}, status=404)
    
    except json.JSONDecodeError:
        return JsonResponse({'success': False, 'message': 'Invalid JSON data'}, status=400)
    except Exception as e:
        return JsonResponse({'success': False, 'message': str(e)}, status=500)
    
    
# ============================================ PURCHASES MODULE VIEWS ======================================================================================

@login_required(login_url='/login/')
def purchases_content(request):
    """Load Purchases content page"""
    return render(request, 'Purchases.html')

# ================================================ PAYMENT STATUS APIs =====================================================================================

@csrf_exempt
@login_required(login_url='/login/')
def api_get_payment_statuses(request):
    """Get all payment statuses"""
    try:
        statuses = list(PaymentStatus.objects.values_list('payment_status', flat=True).order_by('payment_status'))
        return JsonResponse({'success': True, 'data': statuses})
    except Exception as e:
        return JsonResponse({'success': False, 'message': str(e)}, status=500)

@csrf_exempt
@login_required(login_url='/login/')
def api_add_payment_status(request):
    """Add new payment status"""
    if request.method != 'POST':
        return JsonResponse({'success': False, 'message': 'Invalid request method'}, status=405)
    
    try:
        data = json.loads(request.body)
        status_name = data.get('status_name', '').strip()
        
        if not status_name:
            return JsonResponse({'success': False, 'message': 'Payment status name is required'}, status=400)
        
        if PaymentStatus.objects.filter(payment_status__iexact=status_name).exists():
            return JsonResponse({'success': False, 'message': 'Payment status already exists'}, status=400)
        
        PaymentStatus.objects.create(payment_status=status_name)
        
        return JsonResponse({'success': True, 'message': 'Payment status added successfully'})
    
    except json.JSONDecodeError:
        return JsonResponse({'success': False, 'message': 'Invalid JSON data'}, status=400)
    except Exception as e:
        return JsonResponse({'success': False, 'message': str(e)}, status=500)

# ================================================== SHIPPING STATUS APIs =======================================================================================

@csrf_exempt
@login_required(login_url='/login/')
def api_get_shipping_statuses(request):
    """Get all shipping statuses"""
    try:
        statuses = list(ShippingStatus.objects.values_list('shipping_status', flat=True).order_by('shipping_status'))
        return JsonResponse({'success': True, 'data': statuses})
    except Exception as e:
        return JsonResponse({'success': False, 'message': str(e)}, status=500)

@csrf_exempt
@login_required(login_url='/login/')
def api_add_shipping_status(request):
    """Add new shipping status"""
    if request.method != 'POST':
        return JsonResponse({'success': False, 'message': 'Invalid request method'}, status=405)
    
    try:
        data = json.loads(request.body)
        status_name = data.get('status_name', '').strip()
        
        if not status_name:
            return JsonResponse({'success': False, 'message': 'Shipping status name is required'}, status=400)
        
        if ShippingStatus.objects.filter(shipping_status__iexact=status_name).exists():
            return JsonResponse({'success': False, 'message': 'Shipping status already exists'}, status=400)
        
        ShippingStatus.objects.create(shipping_status=status_name)
        
        return JsonResponse({'success': True, 'message': 'Shipping status added successfully'})
    
    except json.JSONDecodeError:
        return JsonResponse({'success': False, 'message': 'Invalid JSON data'}, status=400)
    except Exception as e:
        return JsonResponse({'success': False, 'message': str(e)}, status=500)

# =================================== PURCHASE ORDER APIs ===================================================================================================

@csrf_exempt
@login_required(login_url='/login/')
def api_generate_po_id(request):
    """Generate unique PO ID in format PO00001 and corresponding Bill Number B00001"""
    try:
        max_po = PurchaseOrder.objects.aggregate(Max('po_id'))['po_id__max']
        
        if max_po:
            num_part = int(max_po[2:]) + 1
        else:
            num_part = 1
        
        new_po_id = f"PO{num_part:05d}"
        
        # Make sure it doesn't exist
        while PurchaseOrder.objects.filter(po_id=new_po_id).exists():
            num_part += 1
            new_po_id = f"PO{num_part:05d}"
        
        # Generate corresponding bill number
        bill_number = f"B{num_part:05d}"
        
        return JsonResponse({
            'success': True, 
            'po_id': new_po_id,
            'bill_number': bill_number
        })
    
    except Exception as e:
        return JsonResponse({'success': False, 'message': str(e)}, status=500)

@csrf_exempt
@login_required(login_url='/login/')
def api_generate_detail_id(request):
    """Generate unique Detail ID in format D00001 - globally incremental"""
    try:
        # Get the maximum detail_id from ALL purchase details
        max_detail = PurchaseDetail.objects.aggregate(Max('detail_id'))['detail_id__max']
        
        if max_detail:
            # Extract numeric part (remove 'D' prefix) and increment
            num_part = int(max_detail[1:]) + 1
        else:
            # First detail ever
            num_part = 1
        
        # Format as D00001
        new_detail_id = f"D{num_part:05d}"
        
        # Safety check: ensure it doesn't exist (should never happen, but good practice)
        while PurchaseDetail.objects.filter(detail_id=new_detail_id).exists():
            num_part += 1
            new_detail_id = f"D{num_part:05d}"
        
        return JsonResponse({'success': True, 'detail_id': new_detail_id})
    
    except Exception as e:
        return JsonResponse({'success': False, 'message': str(e)}, status=500)
    
    """    LOGIC BEHIND THE DETAIL ID GENERATION
        # OLD (WRONG - was filtering by PO):
          max_detail = PurchaseDetail.objects.filter(po_id=current_po).aggregate(Max('detail_id'))

        # NEW (CORRECT - checks ALL details globally):
          max_detail = PurchaseDetail.objects.aggregate(Max('detail_id'))['detail_id__max']
    """
    
# ======================== API FOR GENERATING A NEW DETAIL ID FOR EVERY PURCHASE ORDER ITEM ===================================================================
@csrf_exempt
@login_required(login_url='/login/')
def api_get_next_detail_number(request):
    """Get the next available detail number (not full ID, just the number)"""
    try:
        max_detail = PurchaseDetail.objects.aggregate(Max('detail_id'))['detail_id__max']
        
        if max_detail:
            next_number = int(max_detail[1:]) + 1
        else:
            next_number = 1
        
        return JsonResponse({'success': True, 'next_number': next_number})
    
    except Exception as e:
        return JsonResponse({'success': False, 'message': str(e)}, status=500)
    
    
@csrf_exempt
@login_required(login_url='/login/')
def api_get_purchase_orders(request):
    """Get all purchase orders with calculated totals"""
    try:
        purchase_orders = PurchaseOrder.objects.select_related(
            'supplier_id', 'county', 'town', 'payment_status', 'shipping_status'
        ).all().order_by('-date')
        
        po_list = []
        for po in purchase_orders:
            # Format date as DD/MM/YYYY
            date_str = po.date.strftime('%d/%m/%Y') if po.date else ''
            
            po_list.append({
                'po_id': po.po_id,
                'date': date_str,
                'supplier_id': po.supplier_id.supplier_id if po.supplier_id else '',
                'supplier_name': po.supplier_name,
                'bill_number': po.bill_number,
                'county': po.county.county if po.county else '',
                'town': po.town.town if po.town else '',
                'total_amount': float(po.total_amount),
                'amount_paid': float(po.amount_paid),
                'balance_left': float(po.total_amount - po.amount_paid),
                'payment_status': po.payment_status.payment_status if po.payment_status else '',
                'shipping_status': po.shipping_status.shipping_status if po.shipping_status else ''
            })
        
        return JsonResponse({'success': True, 'data': po_list})
    
    except Exception as e:
        return JsonResponse({'success': False, 'message': str(e)}, status=500)

@csrf_exempt
@login_required(login_url='/login/')
def api_get_po_details(request, po_id):
    """Get purchase order details including all line items"""
    try:
        # Get purchase order
        po = PurchaseOrder.objects.select_related(
            'supplier_id', 'county', 'town', 'payment_status', 'shipping_status'
        ).get(po_id=po_id)
        
        # Format date
        date_str = po.date.strftime('%d/%m/%Y') if po.date else ''
        
        po_data = {
            'po_id': po.po_id,
            'date': date_str,
            'supplier_id': po.supplier_id.supplier_id if po.supplier_id else '',
            'supplier_name': po.supplier_name,
            'bill_number': po.bill_number,
            'county': po.county.county if po.county else '',
            'town': po.town.town if po.town else '',
            'total_amount': float(po.total_amount),
            'amount_paid': float(po.amount_paid),
            'payment_status': po.payment_status.payment_status if po.payment_status else '',
            'shipping_status': po.shipping_status.shipping_status if po.shipping_status else ''
        }
        
        # Get purchase details
        details = PurchaseDetail.objects.filter(po_id=po).order_by('detail_id')
        details_list = []
        
        for detail in details:
            detail_date_str = detail.date.strftime('%d/%m/%Y') if detail.date else ''
            
            details_list.append({
                'detail_id': detail.detail_id,
                'date': detail_date_str,
                'po_id': detail.po_id.po_id,
                'supplier_id': detail.supplier_id.supplier_id if detail.supplier_id else '',
                'supplier_name': detail.supplier_name,
                'county': detail.county.county if detail.county else '',
                'town': detail.town.town if detail.town else '',
                'bill_number': detail.bill_number,
                'item_id': detail.item_id.item_id if detail.item_id else '',
                'item_type': detail.item_type,
                'item_category': detail.item_category,
                'item_subcategory': detail.item_subcategory,
                'item_name': detail.item_name,
                'quantity_purchased': detail.quantity_purchased,
                'unit_cost': float(detail.unit_cost),
                'tax_rate': float(detail.tax_rate),
                'cost_excluding_tax': float(detail.cost_excluding_tax),
                'total_tax': float(detail.total_tax),
                'cost_including_tax': float(detail.cost_including_tax),
                'shipping_fees': float(detail.shipping_fees),
                'total_purchase_price': float(detail.total_purchase_price)
            })
        
        return JsonResponse({
            'success': True,
            'data': {
                'purchase_order': po_data,
                'purchase_details': details_list
            }
        })
    
    except PurchaseOrder.DoesNotExist:
        return JsonResponse({'success': False, 'message': 'Purchase order not found'}, status=404)
    except Exception as e:
        return JsonResponse({'success': False, 'message': str(e)}, status=500)

def parse_date(date_str):
    """Parse date from DD/MM/YYYY format"""
    try:
        return datetime.strptime(date_str, '%d/%m/%Y').date()
    except:
        return None

@csrf_exempt
@login_required(login_url='/login/')
def api_add_purchase_order(request):
    """Add new purchase order with details"""
    if request.method != 'POST':
        return JsonResponse({'success': False, 'message': 'Invalid request method'}, status=405)
    
    try:
        data = json.loads(request.body)
        
        # Extract PO header data
        po_id = data.get('po_id', '').strip()
        date_str = data.get('date', '').strip()
        supplier_id = data.get('supplier_id', '').strip()
        supplier_name = data.get('supplier_name', '').strip()
        county_name = data.get('county', '').strip()
        town_name = data.get('town', '').strip()
        bill_number = data.get('bill_number', '').strip()
        items = data.get('items', [])
        
        # Validation
        if not all([po_id, date_str, supplier_name, bill_number]):
            return JsonResponse({
                'success': False, 
                'message': 'All PO header fields are required'
            }, status=400)
        
        if not items:
            return JsonResponse({
                'success': False, 
                'message': 'At least one item is required'
            }, status=400)
        
        # Parse date
        po_date = parse_date(date_str)
        if not po_date:
            return JsonResponse({
                'success': False, 
                'message': 'Invalid date format. Use DD/MM/YYYY'
            }, status=400)
        
        # Check if PO already exists
        if PurchaseOrder.objects.filter(po_id=po_id).exists():
            return JsonResponse({
                'success': False, 
                'message': 'Purchase Order ID already exists'
            }, status=400)
        
        # Get foreign key objects
        try:
            supplier = Supplier.objects.get(supplier_id=supplier_id)
            county = County.objects.get(county=county_name) if county_name else None
            town = Town.objects.get(town=town_name) if town_name else None
        except (Supplier.DoesNotExist, County.DoesNotExist, Town.DoesNotExist) as e:
            return JsonResponse({
                'success': False, 
                'message': f'Invalid reference: {str(e)}'
            }, status=400)
        
        # Start transaction
        with transaction.atomic():
            # Calculate total amount
            total_amount = sum(Decimal(str(item['total_purchase_price'])) for item in items)
            
            # Create Purchase Order
            purchase_order = PurchaseOrder.objects.create(
                po_id=po_id,
                date=po_date,
                supplier_id=supplier,
                supplier_name=supplier_name,
                bill_number=bill_number,
                county=county,
                town=town,
                total_amount=total_amount,
                amount_paid=Decimal('0.00'),
                payment_status=None,
                shipping_status=None
            )
            
            # Create Purchase Details and update inventory
            for item_data in items:
                detail_date = parse_date(item_data['date'])
                if not detail_date:
                    detail_date = po_date
                
                # Get inventory item
                try:
                    inventory_item = Inventory.objects.get(item_id=item_data['item_id'])
                except Inventory.DoesNotExist:
                    raise Exception(f"Inventory item {item_data['item_id']} not found")
                
                # Create purchase detail
                PurchaseDetail.objects.create(
                    detail_id=item_data['detail_id'],
                    po_id=purchase_order,
                    date=detail_date,
                    supplier_id=supplier,
                    supplier_name=supplier_name,
                    county=county,
                    town=town,
                    bill_number=bill_number,
                    item_id=inventory_item,
                    item_type=item_data['item_type'],
                    item_category=item_data['item_category'],
                    item_subcategory=item_data['item_subcategory'],
                    item_name=item_data['item_name'],
                    quantity_purchased=item_data['quantity_purchased'],
                    unit_cost=Decimal(str(item_data['unit_cost'])),
                    tax_rate=Decimal(str(item_data['tax_rate']))
                )
                
                # Update inventory quantities
                inventory_item.quantity_purchased += item_data['quantity_purchased']
                inventory_item.save()  # This will trigger reorder check
            
            # Update supplier total purchases
            supplier.total_purchases += total_amount
            supplier.save()
        
        return JsonResponse({
            'success': True, 
            'message': 'Purchase Order created successfully'
        })
    
    except json.JSONDecodeError:
        return JsonResponse({'success': False, 'message': 'Invalid JSON data'}, status=400)
    except Exception as e:
        return JsonResponse({'success': False, 'message': str(e)}, status=500)

@csrf_exempt
@login_required(login_url='/login/')
def api_update_purchase_order(request):
    """Update existing purchase order"""
    if request.method != 'POST':
        return JsonResponse({'success': False, 'message': 'Invalid request method'}, status=405)
    
    try:
        data = json.loads(request.body)
        
        po_id = data.get('po_id', '').strip()
        items = data.get('items', [])
        
        if not po_id:
            return JsonResponse({'success': False, 'message': 'PO ID is required'}, status=400)
        
        # Get existing PO
        try:
            purchase_order = PurchaseOrder.objects.get(po_id=po_id)
        except PurchaseOrder.DoesNotExist:
            return JsonResponse({'success': False, 'message': 'Purchase order not found'}, status=404)
        
        with transaction.atomic():
            # Get existing details to calculate old quantities
            existing_details = {d.detail_id: d for d in PurchaseDetail.objects.filter(po_id=purchase_order)}
            
            # Process each item
            new_total = Decimal('0.00')
            processed_details = set()
            
            for item_data in items:
                detail_id = item_data['detail_id']
                processed_details.add(detail_id)
                
                new_qty = item_data['quantity_purchased']
                total_price = Decimal(str(item_data['total_purchase_price']))
                new_total += total_price
                
                if detail_id in existing_details:
                    # Update existing detail
                    detail = existing_details[detail_id]
                    old_qty = detail.quantity_purchased
                    qty_diff = new_qty - old_qty
                    
                    # Update detail
                    detail.quantity_purchased = new_qty
                    detail.unit_cost = Decimal(str(item_data['unit_cost']))
                    detail.tax_rate = Decimal(str(item_data['tax_rate']))
                    detail.item_type = item_data['item_type']
                    detail.item_category = item_data['item_category']
                    detail.item_subcategory = item_data['item_subcategory']
                    detail.item_name = item_data['item_name']
                    
                    # Update item_id if changed
                    new_item = Inventory.objects.get(item_id=item_data['item_id'])
                    if detail.item_id != new_item:
                        # Reverse old item quantity
                        detail.item_id.quantity_purchased -= old_qty
                        detail.item_id.save()
                        
                        # Add to new item
                        new_item.quantity_purchased += new_qty
                        new_item.save()
                        
                        detail.item_id = new_item
                    else:
                        # Same item, adjust quantity
                        detail.item_id.quantity_purchased += qty_diff
                        detail.item_id.save()
                    
                    detail.save()
            
            # Handle deleted items (items in DB but not in update)
            for detail_id, detail in existing_details.items():
                if detail_id not in processed_details:
                    # This item was deleted - reverse inventory
                    detail.item_id.quantity_purchased -= detail.quantity_purchased
                    detail.item_id.save()
                    detail.delete()
            
            # Update PO total
            old_total = purchase_order.total_amount
            total_diff = new_total - old_total
            
            purchase_order.total_amount = new_total
            purchase_order.save()
            
            # Update supplier total purchases
            supplier = purchase_order.supplier_id
            supplier.total_purchases += total_diff
            supplier.save()
        
        return JsonResponse({
            'success': True, 
            'message': 'Purchase Order updated successfully'
        })
    
    except json.JSONDecodeError:
        return JsonResponse({'success': False, 'message': 'Invalid JSON data'}, status=400)
    except Exception as e:
        return JsonResponse({'success': False, 'message': str(e)}, status=500)

@csrf_exempt
@login_required(login_url='/login/')
def api_delete_purchase_detail(request):
    """Delete a purchase detail and update related records"""
    if request.method != 'POST':
        return JsonResponse({'success': False, 'message': 'Invalid request method'}, status=405)
    
    try:
        data = json.loads(request.body)
        detail_id = data.get('detail_id', '').strip()
        
        if not detail_id:
            return JsonResponse({'success': False, 'message': 'Detail ID is required'}, status=400)
        
        try:
            detail = PurchaseDetail.objects.get(detail_id=detail_id)
        except PurchaseDetail.DoesNotExist:
            return JsonResponse({'success': False, 'message': 'Purchase detail not found'}, status=404)
        
        with transaction.atomic():
            # Reverse inventory quantity
            inventory_item = detail.item_id
            inventory_item.quantity_purchased -= detail.quantity_purchased
            inventory_item.save()
            
            # Update PO total
            po = detail.po_id
            po.total_amount -= detail.total_purchase_price
            po.save()
            
            # Update supplier total
            supplier = detail.supplier_id
            supplier.total_purchases -= detail.total_purchase_price
            supplier.save()
            
            # Delete detail
            detail.delete()
        
        return JsonResponse({
            'success': True, 
            'message': 'Purchase detail deleted successfully'
        })
    
    except json.JSONDecodeError:
        return JsonResponse({'success': False, 'message': 'Invalid JSON data'}, status=400)
    except Exception as e:
        return JsonResponse({'success': False, 'message': str(e)}, status=500)
    
    
# ============================================ SALES MODULE VIEWS ======================================================================================

@login_required(login_url='/login/')
def sales_content(request):
    """Load Sales content page"""
    return render(request, 'Sales.html')

# ================================================ RECEIPT STATUS APIs =====================================================================================

@csrf_exempt
@login_required(login_url='/login/')
def api_get_receipt_statuses(request):
    """Get all receipt statuses"""
    try:
        statuses = list(ReceiptStatus.objects.values_list('receipt_status', flat=True).order_by('receipt_status'))
        return JsonResponse({'success': True, 'data': statuses})
    except Exception as e:
        return JsonResponse({'success': False, 'message': str(e)}, status=500)

@csrf_exempt
@login_required(login_url='/login/')
def api_add_receipt_status(request):
    """Add new receipt status"""
    if request.method != 'POST':
        return JsonResponse({'success': False, 'message': 'Invalid request method'}, status=405)
    
    try:
        data = json.loads(request.body)
        status_name = data.get('status_name', '').strip()
        
        if not status_name:
            return JsonResponse({'success': False, 'message': 'Receipt status name is required'}, status=400)
        
        if ReceiptStatus.objects.filter(receipt_status__iexact=status_name).exists():
            return JsonResponse({'success': False, 'message': 'Receipt status already exists'}, status=400)
        
        ReceiptStatus.objects.create(receipt_status=status_name)
        
        return JsonResponse({'success': True, 'message': 'Receipt status added successfully'})
    
    except json.JSONDecodeError:
        return JsonResponse({'success': False, 'message': 'Invalid JSON data'}, status=400)
    except Exception as e:
        return JsonResponse({'success': False, 'message': str(e)}, status=500)

# ================================================== SHIPPING STATUS APIs (REUSED FROM THE PURCHASES MODULE AS IT IS THE SAME THING) =======================================================================================

@csrf_exempt
@login_required(login_url='/login/')
def api_get_shipping_statuses_sales(request):
    """Get all shipping statuses"""
    try:
        statuses = list(ShippingStatus.objects.values_list('shipping_status', flat=True).order_by('shipping_status'))
        return JsonResponse({'success': True, 'data': statuses})
    except Exception as e:
        return JsonResponse({'success': False, 'message': str(e)}, status=500)

# =================================== SALES ORDER APIs ===================================================================================================

@csrf_exempt
@login_required(login_url='/login/')
def api_generate_so_id(request):
    """Generate unique SO ID in format SO00001 and corresponding Invoice Number I00001"""
    try:
        max_so = SalesOrder.objects.aggregate(Max('so_id'))['so_id__max']
        
        if max_so:
            num_part = int(max_so[2:]) + 1
        else:
            num_part = 1
        
        new_so_id = f"SO{num_part:05d}"
        
        # Make sure it doesn't exist
        while SalesOrder.objects.filter(so_id=new_so_id).exists():
            num_part += 1
            new_so_id = f"SO{num_part:05d}"
        
        # Generate corresponding invoice number
        invoice_number = f"I{num_part:05d}"
        
        return JsonResponse({
            'success': True, 
            'so_id': new_so_id,
            'invoice_number': invoice_number
        })
    
    except Exception as e:
        return JsonResponse({'success': False, 'message': str(e)}, status=500)

@csrf_exempt
@login_required(login_url='/login/')
def api_generate_sales_detail_id(request):
    """
    Generate unique Detail ID in format D00001 - globally incremental across BOTH purchases and sales
    This ensures Detail IDs are unique across the entire system
    """
    try:
        # Get the maximum detail_id from BOTH PurchaseDetail AND SalesDetail
        max_purchase_detail = PurchaseDetail.objects.aggregate(Max('detail_id'))['detail_id__max']
        max_sales_detail = SalesDetail.objects.aggregate(Max('detail_id'))['detail_id__max']
        
        # Compare both and get the highest
        max_details = [max_purchase_detail, max_sales_detail]
        max_details = [d for d in max_details if d is not None]  # Remove None values
        
        if max_details:
            # Extract numeric parts and get the maximum
            max_nums = [int(d[1:]) for d in max_details]
            num_part = max(max_nums) + 1
        else:
            # First detail ever in the entire system
            num_part = 1
        
        # Format as D00001
        new_detail_id = f"D{num_part:05d}"
        
        # Safety check: ensure it doesn't exist in EITHER table
        while (PurchaseDetail.objects.filter(detail_id=new_detail_id).exists() or 
               SalesDetail.objects.filter(detail_id=new_detail_id).exists()):
            num_part += 1
            new_detail_id = f"D{num_part:05d}"
        
        return JsonResponse({'success': True, 'detail_id': new_detail_id})
    
    except Exception as e:
        return JsonResponse({'success': False, 'message': str(e)}, status=500)

@csrf_exempt
@login_required(login_url='/login/')
def api_get_sales_orders(request):
    """Get all sales orders with calculated totals"""
    try:
        sales_orders = SalesOrder.objects.select_related(
            'customer_id', 'county', 'town', 'receipt_status', 'shipping_status'
        ).all().order_by('-date')
        
        so_list = []
        for so in sales_orders:
            # Format date as DD/MM/YYYY
            date_str = so.date.strftime('%d/%m/%Y') if so.date else ''
            
            so_list.append({
                'so_id': so.so_id,
                'date': date_str,
                'customer_id': so.customer_id.customer_id if so.customer_id else '',
                'customer_name': so.customer_name,
                'invoice_number': so.invoice_number,
                'county': so.county.county if so.county else '',
                'town': so.town.town if so.town else '',
                'total_amount': float(so.total_amount),
                'amount_received': float(so.amount_received),
                'balance_left': float(so.total_amount - so.amount_received),
                'receipt_status': so.receipt_status.receipt_status if so.receipt_status else '',
                'shipping_status': so.shipping_status.shipping_status if so.shipping_status else ''
            })
        
        return JsonResponse({'success': True, 'data': so_list})
    
    except Exception as e:
        return JsonResponse({'success': False, 'message': str(e)}, status=500)

@csrf_exempt
@login_required(login_url='/login/')
def api_get_so_details(request, so_id):
    """Get sales order details including all line items"""
    try:
        # Get sales order
        so = SalesOrder.objects.select_related(
            'customer_id', 'county', 'town', 'receipt_status', 'shipping_status'
        ).get(so_id=so_id)
        
        # Format date
        date_str = so.date.strftime('%d/%m/%Y') if so.date else ''
        
        so_data = {
            'so_id': so.so_id,
            'date': date_str,
            'customer_id': so.customer_id.customer_id if so.customer_id else '',
            'customer_name': so.customer_name,
            'invoice_number': so.invoice_number,
            'county': so.county.county if so.county else '',
            'town': so.town.town if so.town else '',
            'total_amount': float(so.total_amount),
            'amount_received': float(so.amount_received),
            'receipt_status': so.receipt_status.receipt_status if so.receipt_status else '',
            'shipping_status': so.shipping_status.shipping_status if so.shipping_status else ''
        }
        
        # Get sales details
        details = SalesDetail.objects.filter(so_id=so).order_by('detail_id')
        details_list = []
        
        for detail in details:
            detail_date_str = detail.date.strftime('%d/%m/%Y') if detail.date else ''
            
            details_list.append({
                'detail_id': detail.detail_id,
                'date': detail_date_str,
                'so_id': detail.so_id.so_id,
                'customer_id': detail.customer_id.customer_id if detail.customer_id else '',
                'customer_name': detail.customer_name,
                'county': detail.county.county if detail.county else '',
                'town': detail.town.town if detail.town else '',
                'invoice_number': detail.invoice_number,
                'item_id': detail.item_id.item_id if detail.item_id else '',
                'item_type': detail.item_type,
                'item_category': detail.item_category,
                'item_subcategory': detail.item_subcategory,
                'item_name': detail.item_name,
                'quantity_sold': detail.quantity_sold,
                'unit_price': float(detail.unit_price),
                'tax_rate': float(detail.tax_rate),
                'price_excluding_tax': float(detail.price_excluding_tax),
                'total_tax': float(detail.total_tax),
                'price_including_tax': float(detail.price_including_tax),
                'shipping_fees': float(detail.shipping_fees),
                'total_sales_price': float(detail.total_sales_price)
            })
        
        return JsonResponse({
            'success': True,
            'data': {
                'sales_order': so_data,
                'sales_details': details_list
            }
        })
    
    except SalesOrder.DoesNotExist:
        return JsonResponse({'success': False, 'message': 'Sales order not found'}, status=404)
    except Exception as e:
        return JsonResponse({'success': False, 'message': str(e)}, status=500)

@csrf_exempt
@login_required(login_url='/login/')
def api_add_sales_order(request):
    """Add new sales order with details - DECREASES inventory quantities"""
    if request.method != 'POST':
        return JsonResponse({'success': False, 'message': 'Invalid request method'}, status=405)
    
    try:
        data = json.loads(request.body)
        
        # Extract SO header data
        so_id = data.get('so_id', '').strip()
        date_str = data.get('date', '').strip()
        customer_id = data.get('customer_id', '').strip()
        customer_name = data.get('customer_name', '').strip()
        county_name = data.get('county', '').strip()
        town_name = data.get('town', '').strip()
        invoice_number = data.get('invoice_number', '').strip()
        items = data.get('items', [])
        
        # Validation
        if not all([so_id, date_str, customer_name, invoice_number]):
            return JsonResponse({
                'success': False, 
                'message': 'All SO header fields are required'
            }, status=400)
        
        if not items:
            return JsonResponse({
                'success': False, 
                'message': 'At least one item is required'
            }, status=400)
        
        # Parse date
        so_date = parse_date(date_str)
        if not so_date:
            return JsonResponse({
                'success': False, 
                'message': 'Invalid date format. Use DD/MM/YYYY'
            }, status=400)
        
        # Check if SO already exists
        if SalesOrder.objects.filter(so_id=so_id).exists():
            return JsonResponse({
                'success': False, 
                'message': 'Sales Order ID already exists'
            }, status=400)
        
        # Get foreign key objects
        try:
            customer = Customer.objects.get(customer_id=customer_id)
            county = County.objects.get(county=county_name) if county_name else None
            town = Town.objects.get(town=town_name) if town_name else None
        except (Customer.DoesNotExist, County.DoesNotExist, Town.DoesNotExist) as e:
            return JsonResponse({
                'success': False, 
                'message': f'Invalid reference: {str(e)}'
            }, status=400)
        
        # Start transaction
        with transaction.atomic():
            # Calculate total amount
            total_amount = sum(Decimal(str(item['total_sales_price'])) for item in items)
            
            # Create Sales Order
            sales_order = SalesOrder.objects.create(
                so_id=so_id,
                date=so_date,
                customer_id=customer,
                customer_name=customer_name,
                invoice_number=invoice_number,
                county=county,
                town=town,
                total_amount=total_amount,
                amount_received=Decimal('0.00'),
                receipt_status=None,
                shipping_status=None
            )
            
            # Create Sales Details and update inventory
            for item_data in items:
                detail_date = parse_date(item_data['date'])
                if not detail_date:
                    detail_date = so_date
                
                # Get inventory item
                try:
                    inventory_item = Inventory.objects.get(item_id=item_data['item_id'])
                except Inventory.DoesNotExist:
                    raise Exception(f"Inventory item {item_data['item_id']} not found")
                
                # Check if sufficient stock exists
                qty_to_sell = item_data['quantity_sold']
                available_qty = inventory_item.quantity_purchased - inventory_item.quantity_sold
                
                if qty_to_sell > available_qty:
                    raise Exception(f"Insufficient stock for {item_data['item_name']}. Available: {available_qty}, Requested: {qty_to_sell}")
                
                # Create sales detail
                SalesDetail.objects.create(
                    detail_id=item_data['detail_id'],
                    so_id=sales_order,
                    date=detail_date,
                    customer_id=customer,
                    customer_name=customer_name,
                    county=county,
                    town=town,
                    invoice_number=invoice_number,
                    item_id=inventory_item,
                    item_type=item_data['item_type'],
                    item_category=item_data['item_category'],
                    item_subcategory=item_data['item_subcategory'],
                    item_name=item_data['item_name'],
                    quantity_sold=qty_to_sell,
                    unit_price=Decimal(str(item_data['unit_price'])),
                    tax_rate=Decimal(str(item_data['tax_rate']))
                )
                
                # Update inventory quantities (DECREASE quantity_sold)
                inventory_item.quantity_sold += qty_to_sell
                inventory_item.save()  # This will trigger reorder check
            
            # Update customer total sales
            customer.total_sales += total_amount
            customer.save()
        
        return JsonResponse({
            'success': True, 
            'message': 'Sales Order created successfully'
        })
    
    except json.JSONDecodeError:
        return JsonResponse({'success': False, 'message': 'Invalid JSON data'}, status=400)
    except Exception as e:
        return JsonResponse({'success': False, 'message': str(e)}, status=500)

@csrf_exempt
@login_required(login_url='/login/')
def api_update_sales_order(request):
    """Update existing sales order"""
    if request.method != 'POST':
        return JsonResponse({'success': False, 'message': 'Invalid request method'}, status=405)
    
    try:
        data = json.loads(request.body)
        
        so_id = data.get('so_id', '').strip()
        items = data.get('items', [])
        
        if not so_id:
            return JsonResponse({'success': False, 'message': 'SO ID is required'}, status=400)
        
        # Get existing SO
        try:
            sales_order = SalesOrder.objects.get(so_id=so_id)
        except SalesOrder.DoesNotExist:
            return JsonResponse({'success': False, 'message': 'Sales order not found'}, status=404)
        
        with transaction.atomic():
            # Get existing details to calculate old quantities
            existing_details = {d.detail_id: d for d in SalesDetail.objects.filter(so_id=sales_order)}
            
            # Process each item
            new_total = Decimal('0.00')
            processed_details = set()
            
            for item_data in items:
                detail_id = item_data['detail_id']
                processed_details.add(detail_id)
                
                new_qty = item_data['quantity_sold']
                total_price = Decimal(str(item_data['total_sales_price']))
                new_total += total_price
                
                if detail_id in existing_details:
                    # Update existing detail
                    detail = existing_details[detail_id]
                    old_qty = detail.quantity_sold
                    qty_diff = new_qty - old_qty
                    
                    # Update detail
                    detail.quantity_sold = new_qty
                    detail.unit_price = Decimal(str(item_data['unit_price']))
                    detail.tax_rate = Decimal(str(item_data['tax_rate']))
                    detail.item_type = item_data['item_type']
                    detail.item_category = item_data['item_category']
                    detail.item_subcategory = item_data['item_subcategory']
                    detail.item_name = item_data['item_name']
                    
                    # Update item_id if changed
                    new_item = Inventory.objects.get(item_id=item_data['item_id'])
                    if detail.item_id != new_item:
                        # Reverse old item quantity (add back)
                        detail.item_id.quantity_sold -= old_qty
                        detail.item_id.save()
                        
                        # Deduct from new item
                        new_item.quantity_sold += new_qty
                        new_item.save()
                        
                        detail.item_id = new_item
                    else:
                        # Same item, adjust quantity
                        detail.item_id.quantity_sold += qty_diff
                        detail.item_id.save()
                    
                    detail.save()
            
            # Handle deleted items (items in DB but not in update)
            for detail_id, detail in existing_details.items():
                if detail_id not in processed_details:
                    # This item was deleted - reverse inventory (add back)
                    detail.item_id.quantity_sold -= detail.quantity_sold
                    detail.item_id.save()
                    detail.delete()
            
            # Update SO total
            old_total = sales_order.total_amount
            total_diff = new_total - old_total
            
            sales_order.total_amount = new_total
            sales_order.save()
            
            # Update customer total sales
            customer = sales_order.customer_id
            customer.total_sales += total_diff
            customer.save()
        
        return JsonResponse({
            'success': True, 
            'message': 'Sales Order updated successfully'
        })
    
    except json.JSONDecodeError:
        return JsonResponse({'success': False, 'message': 'Invalid JSON data'}, status=400)
    except Exception as e:
        return JsonResponse({'success': False, 'message': str(e)}, status=500)

@csrf_exempt
@login_required(login_url='/login/')
def api_delete_sales_detail(request):
    """Delete a sales detail and update related records"""
    if request.method != 'POST':
        return JsonResponse({'success': False, 'message': 'Invalid request method'}, status=405)
    
    try:
        data = json.loads(request.body)
        detail_id = data.get('detail_id', '').strip()
        
        if not detail_id:
            return JsonResponse({'success': False, 'message': 'Detail ID is required'}, status=400)
        
        try:
            detail = SalesDetail.objects.get(detail_id=detail_id)
        except SalesDetail.DoesNotExist:
            return JsonResponse({'success': False, 'message': 'Sales detail not found'}, status=404)
        
        with transaction.atomic():
            # Reverse inventory quantity (add back)
            inventory_item = detail.item_id
            inventory_item.quantity_sold -= detail.quantity_sold
            inventory_item.save()
            
            # Update SO total
            so = detail.so_id
            so.total_amount -= detail.total_sales_price
            so.save()
            
            # Update customer total
            customer = detail.customer_id
            customer.total_sales -= detail.total_sales_price
            customer.save()
            
            # Delete detail
            detail.delete()
        
        return JsonResponse({
            'success': True, 
            'message': 'Sales detail deleted successfully'
        })
    
    except json.JSONDecodeError:
        return JsonResponse({'success': False, 'message': 'Invalid JSON data'}, status=400)
    except Exception as e:
        return JsonResponse({'success': False, 'message': str(e)}, status=500)