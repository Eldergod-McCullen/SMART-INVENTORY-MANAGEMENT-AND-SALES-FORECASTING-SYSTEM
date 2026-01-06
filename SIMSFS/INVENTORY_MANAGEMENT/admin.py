from django.contrib import admin
from .models import ItemType,ItemCategory,ItemSubcategory,PaymentMode,County,Town,PaymentStatus,ReceiptStatus,ShippingStatus,UserRole
from .models import Inventory,InventoryItem
from .models import Supplier,PurchaseOrder,PurchaseDetail,Payment                                # IMPORT ALL MODEL CLASSES
from .models import Customer,SalesOrder,SalesDetail,Receipt
from .models import UserManager,User


# Register your models here.

# FIRST REGISTERING THE REFERENCE/DIMENSION TABLES
admin.site.register(ItemType)
admin.site.register(ItemCategory)
admin.site.register(ItemSubcategory)
admin.site.register(PaymentMode)
admin.site.register(County)
admin.site.register(Town)
admin.site.register(PaymentStatus)
admin.site.register(ReceiptStatus)
admin.site.register(ShippingStatus)
admin.site.register(UserRole)

# REGISTERING THE MAIN TABLES
admin.site.register(Inventory)
admin.site.register(InventoryItem)
admin.site.register(Supplier)
admin.site.register(PurchaseOrder)
admin.site.register(PurchaseDetail)
admin.site.register(Payment)
admin.site.register(Customer)
admin.site.register(SalesOrder)
admin.site.register(SalesDetail)
admin.site.register(Receipt)
admin.site.register(User)
