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

]
