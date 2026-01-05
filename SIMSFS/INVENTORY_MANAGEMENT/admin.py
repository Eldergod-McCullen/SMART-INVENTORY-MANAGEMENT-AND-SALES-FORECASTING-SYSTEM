from django.contrib import admin
from .models import ItemType,ItemCategory,ItemSubcategory,PaymentMode,County,Town,PaymentStatus,ReceiptStatus,ShippingStatus,UserRole
from .models import Inventory,InventoryItem
from .models import Supplier,PurchaseOrder,PurchaseDetail,Payment                                # IMPORT ALL MODEL CLASSES
from .models import Customer,SalesOrder,SalesDetail,Receipt
from .models import UserManager,User


# Register your models here.

# FIRST REGISTERING THE REFERENCE/DIMENSION TABLES
admin.site.register(ItemType,ItemCategory,ItemSubcategory,PaymentMode,County,Town,PaymentStatus,ReceiptStatus,ShippingStatus,UserRole)

# REGISTERING THE MAIN TABLES
admin.site.register(Inventory,InventoryItem)
admin.site.register(Supplier,PurchaseOrder,PurchaseDetail,Payment)
admin.site.register(Customer,SalesOrder,SalesDetail,Receipt)
admin.site.register(UserManager,User)
