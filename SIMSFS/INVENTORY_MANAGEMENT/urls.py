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
from django.urls import path
from django.urls import path, include
from . import views


urlpatterns = [
    path('admin/', admin.site.urls),
    path('', views.index, name='index'),     # FOR THE MAIN INDEX PAGE
    # Authentication
    path('login/', views.login_view, name='login'),
    path('logout/', views.logout_view, name='logout'),
    
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
]


