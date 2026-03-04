/* ============================================================
   SETTINGS.JS
   Static JavaScript for the Settings module.
   Loaded by Settings.html partial template via:
       <script src="{% static 'js/Settings.js' %}"></script>

   CHANGES FROM ORIGINAL:
   1. Removed document.addEventListener('DOMContentLoaded', ...)
      entirely. All setup now inside initSettings() which is
      called at the very bottom of this file.

   2. All globally-exposed names prefixed with stg to prevent
      collisions with other modules in the shared global scope:
        currentUser              → stgCurrentUser
        getCSRFToken()           → stgGetCSRFToken()
        showLoading()            → stgShowLoading()
        hideLoading()            → stgHideLoading()
        setupNavigation()        → stgSetupNavigation()
        loadUserProfile()        → stgLoadUserProfile()
        loadBusinessInfo()       → stgLoadBusinessInfo()
        loadSystemPreferences()  → stgLoadSystemPreferences()
        loadInventorySettings()  → stgLoadInventorySettings()
        setupFormHandlers()      → stgSetupFormHandlers()
        uploadPhoto()            → stgUploadPhoto()
        createBackup()           → stgCreateBackup()
        restoreBackup()          → stgRestoreBackup()
        exportData()             → stgExportData()
        clearAllData()           → stgClearAllData()

   3. Loading overlay:
        id="loadingOverlay"      → id="stgLoadingOverlay"
        class .loading-overlay   → .stg-loading-overlay  (CSS)
        Toggled via classList.add/remove('active').

   4. onclick="" attributes in the HTML updated to stg prefix:
        uploadPhoto()            → stgUploadPhoto()
        loadUserProfile()        → stgLoadUserProfile()
        loadBusinessInfo()       → stgLoadBusinessInfo()
        loadSystemPreferences()  → stgLoadSystemPreferences()
        loadInventorySettings()  → stgLoadInventorySettings()
        createBackup()           → stgCreateBackup()
        restoreBackup()          → stgRestoreBackup()
        exportData('...')        → stgExportData('...')
        clearAllData()           → stgClearAllData()

   5. self-initialises at bottom of file — no separate inline
      <script>initSettings();</script> needed in the HTML.
   ============================================================ */

console.log('⚙️ Settings.js loading...');

/* ---- Global State ---- */
let stgCurrentUser = null;


/* ---- CSRF Helper ---- */
function stgGetCSRFToken() {
    const metaTag = document.querySelector('meta[name="csrf-token"]');
    if (metaTag) return metaTag.getAttribute('content');
    const cookies = document.cookie.split(';');
    for (let cookie of cookies) {
        const [name, value] = cookie.trim().split('=');
        if (name === 'csrftoken') return decodeURIComponent(value);
    }
    return null;
}


/* ---- Loading Overlay ---- */
function stgShowLoading() {
    document.getElementById('stgLoadingOverlay').classList.add('active');
}

function stgHideLoading() {
    document.getElementById('stgLoadingOverlay').classList.remove('active');
}


/* ============================================================
   ENTRY POINT
   ============================================================ */
function initSettings() {
    console.log('✅ Settings module initialised');
    stgSetupNavigation();
    stgLoadUserProfile();
    stgLoadBusinessInfo();
    stgLoadSystemPreferences();
    stgLoadInventorySettings();
    stgSetupFormHandlers();
    stgLoadSavedPhoto();
}


/* ---- Navigation ---- */
function stgSetupNavigation() {
    const navItems = document.querySelectorAll('.settings-nav-item');
    const sections = document.querySelectorAll('.settings-section');

    navItems.forEach(item => {
        item.addEventListener('click', function () {
            const sectionId = this.getAttribute('data-section');

            navItems.forEach(nav => nav.classList.remove('active'));
            this.classList.add('active');

            sections.forEach(section => section.classList.remove('active'));
            document.getElementById(`${sectionId}-section`).classList.add('active');
        });
    });
}


/* ---- Load User Profile ---- */
async function stgLoadUserProfile() {
    try {
        stgShowLoading();

        const response = await fetch('/api/user/profile/', {
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': stgGetCSRFToken()
            },
            credentials: 'same-origin'
        });

        const result = await response.json();

        if (result.success) {
            stgCurrentUser = result.data;

            document.getElementById('userName').textContent     = stgCurrentUser.full_name;
            document.getElementById('userEmail').textContent    = stgCurrentUser.email;
            document.getElementById('profileName').value        = stgCurrentUser.full_name;
            document.getElementById('profileEmail').value       = stgCurrentUser.email;
            document.getElementById('profilePhone').value       = stgCurrentUser.phone_number || '';
            document.getElementById('profileRole').value        = stgCurrentUser.user_role   || 'User';

            const photoDiv      = document.getElementById('profilePhoto');
            photoDiv.innerHTML  = `<span style="font-size:3rem;">${stgCurrentUser.full_name.charAt(0).toUpperCase()}</span>`;
        }
    } catch (error) {
        console.error('Error loading profile:', error);
    } finally {
        stgHideLoading();
    }
}


/* ---- Load Business Info ---- */
async function stgLoadBusinessInfo() {
    try {
        /* Load counties */
        const countiesResponse = await fetch('/api/suppliers/counties/', {
            headers: { 'X-CSRFToken': stgGetCSRFToken() },
            credentials: 'same-origin'
        });
        const countiesData = await countiesResponse.json();

        if (countiesData.success) {
            const countySelect = document.getElementById('businessCounty');
            countiesData.data.forEach(county => {
                const option       = document.createElement('option');
                option.value       = county;
                option.textContent = county;
                countySelect.appendChild(option);
            });
        }

        /* Load towns */
        const townsResponse = await fetch('/api/suppliers/towns/', {
            headers: { 'X-CSRFToken': stgGetCSRFToken() },
            credentials: 'same-origin'
        });
        const townsData = await townsResponse.json();

        if (townsData.success) {
            const townSelect = document.getElementById('businessTown');
            townsData.data.forEach(town => {
                const option       = document.createElement('option');
                option.value       = town;
                option.textContent = town;
                townSelect.appendChild(option);
            });
        }

        /* Restore from localStorage */
        const savedBusinessInfo = localStorage.getItem('businessInfo');
        if (savedBusinessInfo) {
            const b = JSON.parse(savedBusinessInfo);
            document.getElementById('businessName').value    = b.name         || '';
            document.getElementById('businessReg').value     = b.registration || '';
            document.getElementById('businessPhone').value   = b.phone        || '';
            document.getElementById('businessEmail').value   = b.email        || '';
            document.getElementById('businessCounty').value  = b.county       || '';
            document.getElementById('businessTown').value    = b.town         || '';
            document.getElementById('businessAddress').value = b.address      || '';
        }
    } catch (error) {
        console.error('Error loading business info:', error);
    }
}


/* ---- Load System Preferences ---- */
function stgLoadSystemPreferences() {
    const savedPrefs = localStorage.getItem('systemPreferences');
    if (savedPrefs) {
        const prefs = JSON.parse(savedPrefs);
        document.getElementById('salesTaxRate').value    = prefs.salesTaxRate    || 16;
        document.getElementById('purchaseTaxRate').value = prefs.purchaseTaxRate || 16;
        document.getElementById('paymentTerms').value    = prefs.paymentTerms    || 30;
        document.getElementById('currency').value        = prefs.currency        || 'KSH';
        document.getElementById('dateFormat').value      = prefs.dateFormat      || 'DD/MM/YYYY';
        document.getElementById('recordsPerPage').value  = prefs.recordsPerPage  || 25;
    }
}


/* ---- Load Inventory Settings ---- */
function stgLoadInventorySettings() {
    const savedSettings = localStorage.getItem('inventorySettings');
    if (savedSettings) {
        const s = JSON.parse(savedSettings);
        document.getElementById('defaultReorderLevel').value = s.defaultReorderLevel || 10;
        document.getElementById('lowStockThreshold').value   = s.lowStockThreshold   || 20;
        document.getElementById('itemIdPrefix').value        = s.itemIdPrefix        || 'IT';
        document.getElementById('autoGenerateIds').value     = s.autoGenerateIds     || 'yes';
    }
}


/* ---- Load Saved Profile Photo ---- */
function stgLoadSavedPhoto() {
    const savedPhoto = localStorage.getItem('profilePhoto');
    if (savedPhoto) {
        const photoDiv     = document.getElementById('profilePhoto');
        photoDiv.innerHTML = `<img src="${savedPhoto}" alt="Profile Photo">`;
    }

    /* Wire up the file input change listener */
    const photoInput = document.getElementById('photoInput');
    if (photoInput) {
        photoInput.addEventListener('change', function (e) {
            const file = e.target.files[0];
            if (!file) return;

            const reader    = new FileReader();
            reader.onload   = function (event) {
                const photoDiv     = document.getElementById('profilePhoto');
                photoDiv.innerHTML = `<img src="${event.target.result}" alt="Profile Photo">`;
                localStorage.setItem('profilePhoto', event.target.result);
            };
            reader.readAsDataURL(file);
        });
    }
}


/* ---- Photo Upload Trigger ---- */
function stgUploadPhoto() {
    document.getElementById('photoInput').click();
}


/* ---- Form Handlers ---- */
function stgSetupFormHandlers() {

    /* --- Profile Form --- */
    document.getElementById('profileForm').addEventListener('submit', async function (e) {
        e.preventDefault();

        const formData = {
            full_name:    document.getElementById('profileName').value.trim(),
            phone_number: document.getElementById('profilePhone').value.trim()
        };

        try {
            stgShowLoading();

            const response = await fetch('/api/user/update-profile/', {
                method:      'POST',
                headers:     { 'Content-Type': 'application/json', 'X-CSRFToken': stgGetCSRFToken() },
                credentials: 'same-origin',
                body:        JSON.stringify(formData)
            });

            const result = await response.json();

            if (result.success) {
                alert('Profile updated successfully!');
                stgLoadUserProfile();
            } else {
                alert('Error: ' + result.message);
            }
        } catch (error) {
            console.error('Error updating profile:', error);
            alert('Failed to update profile');
        } finally {
            stgHideLoading();
        }
    });

    /* --- Password Form --- */
    document.getElementById('passwordForm').addEventListener('submit', async function (e) {
        e.preventDefault();

        const currentPassword = document.getElementById('currentPassword').value;
        const newPassword     = document.getElementById('newPassword').value;
        const confirmPassword = document.getElementById('confirmPassword').value;

        if (newPassword !== confirmPassword) {
            alert('New passwords do not match!');
            return;
        }

        if (newPassword.length < 6) {
            alert('Password must be at least 6 characters long');
            return;
        }

        try {
            stgShowLoading();

            const response = await fetch('/api/user/change-password/', {
                method:      'POST',
                headers:     { 'Content-Type': 'application/json', 'X-CSRFToken': stgGetCSRFToken() },
                credentials: 'same-origin',
                body:        JSON.stringify({ current_password: currentPassword, new_password: newPassword })
            });

            const result = await response.json();

            if (result.success) {
                alert('Password changed successfully!');
                this.reset();
            } else {
                alert('Error: ' + result.message);
            }
        } catch (error) {
            console.error('Error changing password:', error);
            alert('Failed to change password');
        } finally {
            stgHideLoading();
        }
    });

    /* --- Business Form --- */
    document.getElementById('businessForm').addEventListener('submit', function (e) {
        e.preventDefault();

        const businessInfo = {
            name:         document.getElementById('businessName').value.trim(),
            registration: document.getElementById('businessReg').value.trim(),
            phone:        document.getElementById('businessPhone').value.trim(),
            email:        document.getElementById('businessEmail').value.trim(),
            county:       document.getElementById('businessCounty').value,
            town:         document.getElementById('businessTown').value,
            address:      document.getElementById('businessAddress').value.trim()
        };

        localStorage.setItem('businessInfo', JSON.stringify(businessInfo));
        alert('Business information saved successfully!');
    });

    /* --- System Preferences Form --- */
    document.getElementById('systemForm').addEventListener('submit', function (e) {
        e.preventDefault();

        const prefs = {
            salesTaxRate:    parseFloat(document.getElementById('salesTaxRate').value),
            purchaseTaxRate: parseFloat(document.getElementById('purchaseTaxRate').value),
            paymentTerms:    parseInt(document.getElementById('paymentTerms').value),
            currency:        document.getElementById('currency').value,
            dateFormat:      document.getElementById('dateFormat').value,
            recordsPerPage:  parseInt(document.getElementById('recordsPerPage').value)
        };

        localStorage.setItem('systemPreferences', JSON.stringify(prefs));
        alert('System preferences saved successfully!');
    });

    /* --- Inventory Settings Form --- */
    document.getElementById('inventoryForm').addEventListener('submit', function (e) {
        e.preventDefault();

        const settings = {
            defaultReorderLevel: parseInt(document.getElementById('defaultReorderLevel').value),
            lowStockThreshold:   parseFloat(document.getElementById('lowStockThreshold').value),
            itemIdPrefix:        document.getElementById('itemIdPrefix').value.trim().toUpperCase(),
            autoGenerateIds:     document.getElementById('autoGenerateIds').value
        };

        localStorage.setItem('inventorySettings', JSON.stringify(settings));
        alert('Inventory settings saved successfully!');
    });
}


/* ---- Backup / Data Functions ---- */
function stgCreateBackup() {
    if (confirm('Create a complete database backup? This may take a few moments.')) {
        stgShowLoading();
        setTimeout(() => {
            stgHideLoading();
            alert(
                'Backup created successfully!\n\n' +
                'Backup file: backup_' + new Date().toISOString().split('T')[0] + '.sql\n\n' +
                'Note: In production, this would create an actual database backup.'
            );
        }, 2000);
    }
}

function stgRestoreBackup() {
    alert(
        'Restore from Backup\n\n' +
        'This feature allows you to restore your database from a previous backup file.\n\n' +
        'In production, you would upload a .sql backup file here.'
    );
}

function stgExportData(type) {
    stgShowLoading();
    setTimeout(() => {
        stgHideLoading();
        alert(
            `Exporting ${type} data...\n\n` +
            `In production, this would generate and download an Excel file with your ${type} data.`
        );
    }, 1000);
}

function stgClearAllData() {
    const confirmation = prompt(
        '⚠️ DANGER: This will DELETE ALL DATA permanently!\n\nType "DELETE ALL DATA" to confirm:'
    );

    if (confirmation === 'DELETE ALL DATA') {
        if (confirm('Are you ABSOLUTELY SURE? This action CANNOT be undone!')) {
            stgShowLoading();
            setTimeout(() => {
                stgHideLoading();
                alert(
                    'In production, this would permanently delete all data from the database.\n\n' +
                    'This is a destructive operation and should require additional authentication.'
                );
            }, 1500);
        }
    } else {
        alert('Confirmation text did not match. Action cancelled.');
    }
}


/* ============================================================
   WINDOW ASSIGNMENTS
   Assign every function called by onclick="" attributes in
   Settings.html to window explicitly.
   ============================================================ */
window.initSettings            = initSettings;
window.stgUploadPhoto          = stgUploadPhoto;
window.stgLoadUserProfile      = stgLoadUserProfile;
window.stgLoadBusinessInfo     = stgLoadBusinessInfo;
window.stgLoadSystemPreferences = stgLoadSystemPreferences;
window.stgLoadInventorySettings = stgLoadInventorySettings;
window.stgCreateBackup         = stgCreateBackup;
window.stgRestoreBackup        = stgRestoreBackup;
window.stgExportData           = stgExportData;
window.stgClearAllData         = stgClearAllData;


/* ============================================================
   SELF-INITIALISE
   By the time this line runs every function above is fully
   defined. No separate <script>initSettings();</script>
   is needed in Settings.html.
   ============================================================ */
initSettings();

console.log('✅ Settings.js complete');