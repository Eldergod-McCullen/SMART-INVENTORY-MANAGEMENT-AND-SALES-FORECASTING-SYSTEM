from django.db import models

# Create your models here.
# MODELS ARE BASICALLY THE DATA REPRESENTATIONS GOING ONTO THE DATABASE 

from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator
from django.contrib.auth.models import AbstractBaseUser, BaseUserManager
from django.contrib.auth.hashers import make_password, check_password

# UNDERSTAND THAT WHEN DEFINING CLASS NAMES,YOU DEFINE THEM AS INDIVIDUALS--ItemCategory,PurchaseOrder
# DIMENSION TABLES/REFERENCE TABLES ALWAYS COME FIRST
class ItemType(models.Model):
    item_type = models.CharField(max_length=50, unique=True, primary_key=True)
    
    class Meta:
        db_table = 'ITEM TYPES'
        verbose_name = 'Item Type'
        verbose_name_plural = 'Item Types'
    
    def __str__(self):
        return self.item_type


class ItemCategory(models.Model):
    item_category = models.CharField(max_length=50, unique=True, primary_key=True)
    
    class Meta:
        db_table = 'ITEM CATEGORIES'
        verbose_name = 'Item Category'
        verbose_name_plural = 'Item Categories'
    
    def __str__(self):
        return self.item_category


class ItemSubcategory(models.Model):
    item_subcategory = models.CharField(max_length=100, unique=True, primary_key=True)
    
    class Meta:
        db_table = 'ITEM SUBCATEGORIES'
        verbose_name = 'Item Subcategory'
        verbose_name_plural = 'Item Subcategories'
    
    def __str__(self):
        return self.item_subcategory


class PaymentMode(models.Model):
    payment_mode = models.CharField(max_length=50, unique=True, primary_key=True)
    
    class Meta:
        db_table = 'PAYMENT MODES'
        verbose_name = 'Payment Mode'
        verbose_name_plural = 'Payment Modes'
    
    def __str__(self):
        return self.payment_mode


class County(models.Model):
    county = models.CharField(max_length=50, unique=True, primary_key=True)
    
    class Meta:
        db_table = 'COUNTIES'
        verbose_name = 'County'
        verbose_name_plural = 'Counties'
    
    def __str__(self):
        return self.county


class Town(models.Model):
    town = models.CharField(max_length=100, unique=True, primary_key=True)
    
    class Meta:
        db_table = 'TOWNS'
        verbose_name = 'Town'
        verbose_name_plural = 'Towns'
    
    def __str__(self):
        return self.town


class PaymentStatus(models.Model):
    payment_status = models.CharField(max_length=50, unique=True, primary_key=True)
    
    class Meta:
        db_table = 'PAYMENT STATUSES'
        verbose_name = 'Payment Status'
        verbose_name_plural = 'Payment Statuses'
    
    def __str__(self):
        return self.payment_status


class ReceiptStatus(models.Model):
    receipt_status = models.CharField(max_length=50, unique=True, primary_key=True)
    
    class Meta:
        db_table = 'RECEIPT STATUSES'
        verbose_name = 'Receipt Status'
        verbose_name_plural = 'Receipt Statuses'
    
    def __str__(self):
        return self.receipt_status


class ShippingStatus(models.Model):
    shipping_status = models.CharField(max_length=50, unique=True, primary_key=True)
    
    class Meta:
        db_table = 'SHIPPING STATUSES'
        verbose_name = 'Shipping Status'
        verbose_name_plural = 'Shipping Statuses'
    
    def __str__(self):
        return self.shipping_status


class UserRole(models.Model):
    user_role = models.CharField(max_length=50, unique=True, primary_key=True)
    
    class Meta:
        db_table = 'USER ROLES'
        verbose_name = 'User Role'
        verbose_name_plural = 'User Roles'
    
    def __str__(self):
        return self.user_role


# MAIN TABLES
class Inventory(models.Model):
    REORDER_CHOICES = [
        ('YES', 'Yes'),
        ('NO', 'No'),
    ]
    
    item_id = models.CharField(max_length=7, unique=True, primary_key=True)
    item_type = models.ForeignKey(ItemType, on_delete=models.PROTECT, db_column='ITEM TYPE')
    item_category = models.ForeignKey(ItemCategory, on_delete=models.PROTECT, db_column='ITEM CATEGORY')
    item_subcategory = models.ForeignKey(ItemSubcategory, on_delete=models.PROTECT, db_column='ITEM SUBCATEGORY')
    item_name = models.CharField(max_length=100)
    
    purchase_price = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    sale_price = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    
    quantity_purchased = models.IntegerField(default=0)
    quantity_sold = models.IntegerField(default=0)
    # quantity_remaining IS A COMPUTED PROPERTY
    
    reorder_level = models.IntegerField(default=0)
    reorder_required = models.CharField(max_length=3, choices=REORDER_CHOICES, default='NO')
    
    class Meta:
        db_table = 'INVENTORY'
        verbose_name = 'Inventory Item'
        verbose_name_plural = 'Inventory'
    
    @property
    def quantity_remaining(self):
        return self.quantity_purchased - self.quantity_sold
    
    def save(self, *args, **kwargs):
        # SETTING reorder_required BASED ON quantity_remaining
        if self.quantity_remaining <= self.reorder_level:
            self.reorder_required = 'YES'
        else:
            self.reorder_required = 'NO'
        super().save(*args, **kwargs)
    
    def __str__(self):
        return f"{self.item_id} - {self.item_name}"


class InventoryItem(models.Model):
    item_id = models.CharField(max_length=7, unique=True, primary_key=True)
    item_type = models.ForeignKey(ItemType, on_delete=models.PROTECT, db_column='ITEM TYPE')
    item_category = models.ForeignKey(ItemCategory, on_delete=models.PROTECT, db_column='ITEM CATEGORY')
    item_subcategory = models.ForeignKey(ItemSubcategory, on_delete=models.PROTECT, db_column='ITEM SUBCATEGORY')
    item_name = models.CharField(max_length=100)
    purchase_price = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    sale_price = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    
    class Meta:
        db_table = 'INVENTORY ITEMS'
        verbose_name = 'Inventory Item Master'
        verbose_name_plural = 'Inventory Items Master'
    
    def __str__(self):
        return f"{self.item_id} - {self.item_name}"


class Supplier(models.Model):
    supplier_id = models.CharField(max_length=6, unique=True, primary_key=True)
    supplier_name = models.CharField(max_length=100)
    phone_number = models.CharField(max_length=30, blank=True, null=True)
    email = models.EmailField(max_length=255, blank=True, null=True)
    
    county = models.ForeignKey(County, on_delete=models.PROTECT, db_column='COUNTY', blank=True, null=True)
    town = models.ForeignKey(Town, on_delete=models.PROTECT, db_column='TOWN', blank=True, null=True)
    
    total_purchases = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    total_payments = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    # balance_payable IS A COMPUTED PROPERTY
    
    class Meta:
        db_table = 'SUPPLIERS'
        verbose_name = 'Supplier'
        verbose_name_plural = 'Suppliers'
    
    @property
    def balance_payable(self):
        return self.total_purchases - self.total_payments
    
    def __str__(self):
        return f"{self.supplier_id} - {self.supplier_name}"


class Customer(models.Model):
    customer_id = models.CharField(max_length=6, unique=True, primary_key=True)
    customer_name = models.CharField(max_length=100)
    phone_number = models.CharField(max_length=30, blank=True, null=True)
    email = models.EmailField(max_length=255, blank=True, null=True)
    
    county = models.ForeignKey(County, on_delete=models.PROTECT, db_column='COUNTY', blank=True, null=True)
    town = models.ForeignKey(Town, on_delete=models.PROTECT, db_column='TOWN', blank=True, null=True)
    
    total_sales = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    total_payments = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    # balance_payable IS A COMPUTED PROPERTY
    
    class Meta:
        db_table = 'CUSTOMERS'
        verbose_name = 'Customer'
        verbose_name_plural = 'Customers'
    
    @property
    def balance_payable(self):
        return self.total_sales - self.total_payments
    
    def __str__(self):
        return f"{self.customer_id} - {self.customer_name}"


class PurchaseOrder(models.Model):
    po_id = models.CharField(max_length=7, unique=True, primary_key=True)
    date = models.DateField()
    
    supplier_id = models.ForeignKey(Supplier, on_delete=models.PROTECT, db_column='SUPPLIER ID')
    supplier_name = models.CharField(max_length=100)
    bill_number = models.CharField(max_length=6, unique=True)
    
    county = models.ForeignKey(County, on_delete=models.PROTECT, db_column='COUNTY', blank=True, null=True)
    town = models.ForeignKey(Town, on_delete=models.PROTECT, db_column='TOWN', blank=True, null=True)
    
    total_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    amount_paid = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    # balance_left IS A COMPUTED PROPERTY
    
    payment_status = models.ForeignKey(PaymentStatus, on_delete=models.PROTECT, db_column='PAYMENT STATUS', blank=True, null=True)
    shipping_status = models.ForeignKey(ShippingStatus, on_delete=models.PROTECT, db_column='SHIPPING STATUS', blank=True, null=True)
    
    class Meta:
        db_table = 'PURCHASE ORDERS'
        verbose_name = 'Purchase Order'
        verbose_name_plural = 'Purchase Orders'
    
    @property
    def balance_left(self):
        return self.total_amount - self.amount_paid
    
    def __str__(self):
        return f"{self.po_id} - {self.supplier_name}"


class SalesOrder(models.Model):
    so_id = models.CharField(max_length=7, unique=True, primary_key=True)
    date = models.DateField()
    
    customer_id = models.ForeignKey(Customer, on_delete=models.PROTECT, db_column='CUSTOMER ID')
    customer_name = models.CharField(max_length=100)
    invoice_number = models.CharField(max_length=6, unique=True)
    
    county = models.ForeignKey(County, on_delete=models.PROTECT, db_column='COUNTY', blank=True, null=True)
    town = models.ForeignKey(Town, on_delete=models.PROTECT, db_column='TOWN', blank=True, null=True)
    
    total_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    amount_received = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    # balance_left IS A COMPUTED PROPERTY
    
    receipt_status = models.ForeignKey(ReceiptStatus, on_delete=models.PROTECT, db_column='RECEIPT STATUS', blank=True, null=True)
    shipping_status = models.ForeignKey(ShippingStatus, on_delete=models.PROTECT, db_column='SHIPPING STATUS', blank=True, null=True)
    
    class Meta:
        db_table = 'SALES ORDERS'
        verbose_name = 'Sales Order'
        verbose_name_plural = 'Sales Orders'
    
    @property
    def balance_left(self):
        return self.total_amount - self.amount_received
    
    def __str__(self):
        return f"{self.so_id} - {self.customer_name}"


class PurchaseDetail(models.Model):
    detail_id = models.CharField(max_length=6, unique=True, primary_key=True)
    po_id = models.ForeignKey(PurchaseOrder, on_delete=models.CASCADE, db_column='PO ID')
    date = models.DateField()
    
    supplier_id = models.ForeignKey(Supplier, on_delete=models.PROTECT, db_column='SUPPLIER ID')
    supplier_name = models.CharField(max_length=100)
    county = models.ForeignKey(County, on_delete=models.PROTECT, db_column='COUNTY', blank=True, null=True)
    town = models.ForeignKey(Town, on_delete=models.PROTECT, db_column='TOWN', blank=True, null=True)
    
    bill_number = models.CharField(max_length=6)
    
    item_id = models.ForeignKey(Inventory, on_delete=models.PROTECT, db_column='ITEM ID')
    item_type = models.CharField(max_length=50)
    item_category = models.CharField(max_length=50)
    item_subcategory = models.CharField(max_length=50)
    item_name = models.CharField(max_length=100)
    
    quantity_purchased = models.IntegerField()
    unit_cost = models.DecimalField(max_digits=12, decimal_places=2)
    # cost_excluding_tax IS A COMPUTED PROPERTY
    tax_rate = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    # total_tax IS A COMPUTED PROPERTY
    # cost_including_tax IS A COMPUTED PROPERTY
    # shipping_fees IS A COMPUTED PROPERTY
    # total_purchase_price IS A COMPUTED PROPERTY
    
    class Meta:
        db_table = 'PURCHASE DETAILS'
        verbose_name = 'Purchase Detail'
        verbose_name_plural = 'Purchase Details'
    
    @property
    def cost_excluding_tax(self):
        return self.quantity_purchased * self.unit_cost
    
    @property
    def total_tax(self):
        return self.cost_excluding_tax * self.tax_rate / 100
    
    @property
    def cost_including_tax(self):
        return self.cost_excluding_tax + self.total_tax
    
    @property
    def shipping_fees(self):
        return self.cost_including_tax * 1 / 100
    
    @property
    def total_purchase_price(self):
        return self.cost_including_tax + self.shipping_fees
    
    def __str__(self):
        return f"{self.detail_id} - {self.item_name}"


class SalesDetail(models.Model):
    detail_id = models.CharField(max_length=6, unique=True, primary_key=True)
    so_id = models.ForeignKey(SalesOrder, on_delete=models.CASCADE, db_column='SO ID')
    date = models.DateField()
    
    customer_id = models.ForeignKey(Customer, on_delete=models.PROTECT, db_column='CUSTOMER ID')
    customer_name = models.CharField(max_length=100)
    county = models.ForeignKey(County, on_delete=models.PROTECT, db_column='COUNTY', blank=True, null=True)
    town = models.ForeignKey(Town, on_delete=models.PROTECT, db_column='TOWN', blank=True, null=True)
    
    invoice_number = models.CharField(max_length=6)
    
    item_id = models.ForeignKey(Inventory, on_delete=models.PROTECT, db_column='ITEM ID')
    item_type = models.CharField(max_length=50)
    item_category = models.CharField(max_length=50)
    item_subcategory = models.CharField(max_length=50)
    item_name = models.CharField(max_length=100)
    
    quantity_sold = models.IntegerField()
    unit_price = models.DecimalField(max_digits=12, decimal_places=2)
    # price_excluding_tax IS A COMPUTED PROPERTY
    tax_rate = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    # total_tax IS A COMPUTED PROPERTY
    # price_including_tax IS A COMPUTED PROPERTY
    # shipping_fees IS A COMPUTED PROPERTY
    # total_sales_price IS A COMPUTED PROPERTY
    
    class Meta:
        db_table = 'SALES DETAILS'
        verbose_name = 'Sales Detail'
        verbose_name_plural = 'Sales Details'
    
    @property
    def price_excluding_tax(self):
        return self.quantity_sold * self.unit_price
    
    @property
    def total_tax(self):
        return self.price_excluding_tax * self.tax_rate / 100
    
    @property
    def price_including_tax(self):
        return self.price_excluding_tax + self.total_tax
    
    @property
    def shipping_fees(self):
        return self.price_including_tax * 2 / 100
    
    @property
    def total_sales_price(self):
        return self.price_including_tax + self.shipping_fees
    
    def __str__(self):
        return f"{self.detail_id} - {self.item_name}"


class Payment(models.Model):
    transaction_id = models.CharField(max_length=13, unique=True, primary_key=True)
    date = models.DateField()
    
    supplier_id = models.ForeignKey(Supplier, on_delete=models.PROTECT, db_column='SUPPLIER ID')
    supplier_name = models.CharField(max_length=100)
    county = models.ForeignKey(County, on_delete=models.PROTECT, db_column='COUNTY', blank=True, null=True)
    town = models.ForeignKey(Town, on_delete=models.PROTECT, db_column='TOWN', blank=True, null=True)
    
    po_id = models.ForeignKey(PurchaseOrder, on_delete=models.PROTECT, db_column='PO ID')
    bill_number = models.CharField(max_length=6)
    
    payment_mode = models.ForeignKey(PaymentMode, on_delete=models.PROTECT, db_column='PAYMENT MODE')
    amount_paid = models.DecimalField(max_digits=12, decimal_places=2)
    
    class Meta:
        db_table = 'PAYMENTS'
        verbose_name = 'Payment'
        verbose_name_plural = 'Payments'
    
    def __str__(self):
        return f"{self.transaction_id} - {self.supplier_name}"


class Receipt(models.Model):
    transaction_id = models.CharField(max_length=12, unique=True, primary_key=True)
    date = models.DateField()
    
    customer_id = models.ForeignKey(Customer, on_delete=models.PROTECT, db_column='CUSTOMER ID')
    customer_name = models.CharField(max_length=100)
    county = models.ForeignKey(County, on_delete=models.PROTECT, db_column='COUNTY', blank=True, null=True)
    town = models.ForeignKey(Town, on_delete=models.PROTECT, db_column='TOWN', blank=True, null=True)
    
    so_id = models.ForeignKey(SalesOrder, on_delete=models.PROTECT, db_column='SO ID')
    invoice_number = models.CharField(max_length=6)
    
    payment_mode = models.ForeignKey(PaymentMode, on_delete=models.PROTECT, db_column='PAYMENT MODE')
    amount_received = models.DecimalField(max_digits=12, decimal_places=2)
    
    class Meta:
        db_table = 'RECEIPTS'
        verbose_name = 'Receipt'
        verbose_name_plural = 'Receipts'
    
    def __str__(self):
        return f"{self.transaction_id} - {self.customer_name}"


# CUSTOM USER MANAGER
class UserManager(BaseUserManager):
    def create_user(self, email, full_name, phone_number, password=None, user_role=None):
        if not email:
            raise ValueError('ALL USERS NEED TO HAVE AN E-MAIL ADDRESS')
        
        user = self.model(
            email=self.normalize_email(email),
            full_name=full_name,
            phone_number=phone_number,
            user_role=user_role
        )
        user.set_password(password)
        user.save(using=self._db)
        return user
    
    def create_superuser(self, email, full_name, phone_number, password=None):
        user = self.create_user(
            email=email,
            full_name=full_name,
            phone_number=phone_number,
            password=password,
            user_role=None  # Set appropriate admin role
        )
        user.is_admin = True
        user.save(using=self._db)
        return user


class User(AbstractBaseUser):
    full_name = models.CharField(max_length=100)
    email = models.EmailField(max_length=100, unique=True, primary_key=True)
    phone_number = models.CharField(max_length=12)
    password = models.CharField(max_length=128)  # Django handles hashing
    user_role = models.ForeignKey(UserRole, on_delete=models.PROTECT, db_column='USER ROLE', blank=True, null=True)
    
    is_active = models.BooleanField(default=True)
    is_admin = models.BooleanField(default=False)
    
    objects = UserManager()
    
    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['full_name', 'phone_number']
    
    class Meta:
        db_table = 'USERS'
        verbose_name = 'User'
        verbose_name_plural = 'Users'
    
    def __str__(self):
        return f"{self.full_name} - {self.email}"
    
    def has_perm(self, perm, obj=None):
        return True
    
    def has_module_perms(self, app_label):
        return True
    
    def check_password(self, raw_password):
        """Check if the provided password matches the stored hash"""
        from django.contrib.auth.hashers import check_password
        return check_password(raw_password, self.password)
    
    def set_password(self, raw_password):
        """Hash and set the password"""
        self.password = make_password(raw_password)
    
    @property
    def is_staff(self):
        return self.is_admin
