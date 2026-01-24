"""
URL configuration for the INVENTORY_MANAGEMENT application.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.2/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path, include
from . import views

urlpatterns = [
    path('admin/', admin.site.urls),
    
    # Authentication URLs
    path('login/', views.login_view, name='login'),
    path('register/', views.register_view, name='register'),
    path('logout/', views.logout_view, name='logout'),
    
    # Main application
    path('', views.index, name='index'),
    
    # Dynamic content loading endpoints
    path('content/dashboard/', views.dashboard_content, name='dashboard'),
    path('content/inventory-items/', views.inventory_items_content, name='inventory_items'),
    path('content/inventory/', views.inventory_content, name='inventory'),
    path('content/suppliers/', views.suppliers_content, name='suppliers'),
    path('content/customers/', views.customers_content, name='customers'),
    path('content/purchases/', views.purchases_content, name='purchases'),
    path('content/sales/', views.sales_content, name='sales'),
    path('content/receipts/', views.receipts_content, name='receipts'),
    path('content/payments/', views.payments_content, name='payments'),
    path('content/reports/', views.reports_content, name='reports'),
    path('content/forecasting/', views.forecasting_content, name='forecasting'),
    path('content/settings/', views.settings_content, name='settings'),
    
    # API ENDPOINTS
    path('api/inventory/', views.api_get_inventory, name='api_get_inventory'),
    path('api/inventory/save/', views.api_save_inventory, name='api_save_inventory'),
    
    # INVENTORY-ITEM URLS
    path('api/inventory-items/types/', views.api_get_item_types, name='api_get_item_types'),
    path('api/inventory-items/types/add/', views.api_add_item_type, name='api_add_item_type'),
    
    path('api/inventory-items/categories/', views.api_get_item_categories, name='api_get_item_categories'),
    path('api/inventory-items/categories/add/', views.api_add_item_category, name='api_add_item_category'),
    
    path('api/inventory-items/subcategories/', views.api_get_item_subcategories, name='api_get_item_subcategories'),
    path('api/inventory-items/subcategories/add/', views.api_add_item_subcategory, name='api_add_item_subcategory'),
    
    path('api/inventory-items/generate-id/', views.api_generate_item_id, name='api_generate_item_id'),
    path('api/inventory-items/', views.api_get_inventory_items, name='api_get_inventory_items'),
    path('api/inventory-items/add/', views.api_add_inventory_item, name='api_add_inventory_item'),
    path('api/inventory-items/update/', views.api_update_inventory_item, name='api_update_inventory_item'),
    path('api/inventory-items/delete/', views.api_delete_inventory_item, name='api_delete_inventory_item'),
    
    path('test/', views.test_page, name='test'),
    
    # INVENTORY URLS / Inventory API endpoints
    path('api/inventory/all/', views.api_get_inventory, name='api_get_inventory'),
    path('api/inventory/update-reorder/', views.api_update_reorder_level, name='api_update_reorder_level'),
    path('api/inventory/delete/', views.api_delete_inventory_item, name='api_delete_inventory_item'),
    
     # Suppliers Module URLs
    path('api/suppliers/counties/', views.api_get_counties, name='api_get_counties'),
    path('api/suppliers/counties/add/', views.api_add_county, name='api_add_county'),
    
    path('api/suppliers/towns/', views.api_get_towns, name='api_get_towns'),
    path('api/suppliers/towns/add/', views.api_add_town, name='api_add_town'),
    
    path('api/suppliers/generate-id/', views.api_generate_supplier_id, name='api_generate_supplier_id'),
    path('api/suppliers/', views.api_get_suppliers, name='api_get_suppliers'),
    path('api/suppliers/add/', views.api_add_supplier, name='api_add_supplier'),
    path('api/suppliers/update/', views.api_update_supplier, name='api_update_supplier'),
    path('api/suppliers/delete/', views.api_delete_supplier, name='api_delete_supplier'),
    
    # CUSTOMER URLS
    path('api/customers/counties/', views.api_get_counties, name='api_get_counties'),
path('api/customers/counties/add/', views.api_add_county, name='api_add_county_customer'),

path('api/customers/towns/', views.api_get_towns, name='api_get_towns'),
path('api/customers/towns/add/', views.api_add_town, name='api_add_town_customer'),

path('api/customers/generate-id/', views.api_generate_customer_id, name='api_generate_customer_id'),
path('api/customers/', views.api_get_customers, name='api_get_customers'),
path('api/customers/add/', views.api_add_customer, name='api_add_customer'),
path('api/customers/update/', views.api_update_customer, name='api_update_customer'),
path('api/customers/delete/', views.api_delete_customer, name='api_delete_customer'),


# ====================================== PURCHASES MODULE URLs =========================================================================================
    
    # Content page
    path('content/purchases/', views.purchases_content, name='purchases'),
    
    # Payment Status APIs
    path('api/purchases/payment-statuses/', views.api_get_payment_statuses, name='api_get_payment_statuses'),
    path('api/purchases/payment-statuses/add/', views.api_add_payment_status, name='api_add_payment_status'),
    
    # Shipping Status APIs
    path('api/purchases/shipping-statuses/', views.api_get_shipping_statuses, name='api_get_shipping_statuses'),
    path('api/purchases/shipping-statuses/add/', views.api_add_shipping_status, name='api_add_shipping_status'),
    
    # Purchase Order APIs
    path('api/purchases/generate-po-id/', views.api_generate_po_id, name='api_generate_po_id'),
    path('api/purchases/generate-detail-id/', views.api_generate_detail_id, name='api_generate_detail_id'),
    path('api/purchases/', views.api_get_purchase_orders, name='api_get_purchase_orders'),
    path('api/purchases/details/<str:po_id>/', views.api_get_po_details, name='api_get_po_details'),
    path('api/purchases/add/', views.api_add_purchase_order, name='api_add_purchase_order'),
    path('api/purchases/update/', views.api_update_purchase_order, name='api_update_purchase_order'),
    path('api/purchases/delete-detail/', views.api_delete_purchase_detail, name='api_delete_purchase_detail'),
    
    path('api/purchases/record-payment/', views.api_record_payment, name='api_record_payment'),
    path('api/purchases/recalculate-statuses/', views.api_recalculate_all_po_statuses, name='api_recalculate_statuses'),
    path('api/purchases/get-next-detail-number/', views.api_get_next_detail_number, name='api_get_next_detail_number'),
    
    # ====================================== SALES MODULE URLs =========================================================================================
    
    # Content page
    path('content/sales/', views.sales_content, name='sales'),
    path('api/sales/', views.api_get_sales_orders, name='api_get_sales_orders'),
    
    # Receipt Status APIs
    path('api/sales/receipt-statuses/', views.api_get_receipt_statuses, name='api_get_receipt_statuses'),   
    path('api/sales/receipt-statuses/add/', views.api_add_receipt_status, name='api_add_receipt_status'),
    
    # Shipping Status APIs (reused from purchases)
    path('api/sales/shipping-statuses/', views.api_get_shipping_statuses_sales, name='api_get_shipping_statuses_sales'),
    
    # Sales Order APIs
    path('api/sales/generate-so-id/', views.api_generate_so_id, name='api_generate_so_id'),
    path('api/sales/generate-detail-id/', views.api_generate_sales_detail_id, name='api_generate_sales_detail_id'),
    path('api/sales/', views.api_get_sales_orders, name='api_get_sales_orders'),
    path('api/sales/details/<str:so_id>/', views.api_get_so_details, name='api_get_so_details'),
    path('api/sales/add/', views.api_add_sales_order, name='api_add_sales_order'),
    path('api/sales/update/', views.api_update_sales_order, name='api_update_sales_order'),
    path('api/sales/delete-detail/', views.api_delete_sales_detail, name='api_delete_sales_detail'),
    path('api/sales/get-next-detail-number/', views.api_get_next_sales_detail_number, name='api_get_next_sales_detail_number'),
    
    
    # ========================== PAYMENT MODULE URLs ===============================================================================================================
    # Content page
path('content/payments/', views.payments_content, name='payments'),

# Payment Mode APIs
path('api/payments/payment-modes/', views.api_get_payment_modes, name='api_get_payment_modes'),
path('api/payments/payment-modes/add/', views.api_add_payment_mode, name='api_add_payment_mode'),

# Transaction ID Generation
path('api/payments/generate-transaction-id/', views.api_generate_transaction_id, name='api_generate_transaction_id'),

# Payment CRUD APIs
path('api/payments/', views.api_get_payments, name='api_get_payments'),
path('api/payments/add/', views.api_add_payment, name='api_add_payment'),
path('api/payments/update/', views.api_update_payment, name='api_update_payment'),
path('api/payments/delete/', views.api_delete_payment, name='api_delete_payment'),

path('api/purchases/get-next-detail-number/', views.api_get_next_detail_number, name='api_get_next_detail_number'),

# Receipt Module URLs
path('content/receipts/', views.receipts_content, name='receipts'),
path('api/receipts/generate-transaction-id/', views.api_generate_receipt_transaction_id, name='api_generate_receipt_transaction_id'),
path('api/receipts/', views.api_get_receipts, name='api_get_receipts'),
path('api/receipts/add/', views.api_add_receipt, name='api_add_receipt'),
path('api/receipts/update/', views.api_update_receipt, name='api_update_receipt'),
path('api/receipts/delete/', views.api_delete_receipt, name='api_delete_receipt'), 


# =============================== DASHBOARD URLS/API ENDPOINTS =======================================================================================================================
path('api/dashboard/sales-details/', views.api_get_all_sales_details, name='api_get_all_sales_details'),
path('api/dashboard/purchase-details/', views.api_get_all_purchase_details, name='api_get_all_purchase_details'),

]
