// Toggle between login and register forms
const container = document.querySelector('.container');
const registerBtn = document.querySelector('.register-btn');
const loginBtn = document.querySelector('.login-btn');

registerBtn.addEventListener('click', () => {
    container.classList.add('active');
});

loginBtn.addEventListener('click', () => {
    container.classList.remove('active');
});

// Helper function to get CSRF token for Django
function getCookie(name) {
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i].trim();
            if (cookie.substring(0, name.length + 1) === (name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}

// Get CSRF token from meta tag or cookie
function getCSRFToken() {
    // First try to get from meta tag
    const metaTag = document.querySelector('meta[name="csrf-token"]');
    if (metaTag) {
        return metaTag.getAttribute('content');
    }
    
    // Then try from cookie
    const cookieToken = getCookie('csrftoken');
    if (cookieToken) {
        return cookieToken;
    }
    
    // Finally try from input field
    const inputToken = document.querySelector('input[name="csrfmiddlewaretoken"]');
    if (inputToken) {
        return inputToken.value;
    }
    
    return null;
}

// ============= LOGIN FUNCTIONALITY =============
document.addEventListener('DOMContentLoaded', function() {
    console.log('Page loaded, initializing login...');
    
    const loginForm = document.querySelector('.form-box.login form');
    const loginButton = loginForm.querySelector('button[name="log-in"]');
    
    console.log('Login button found:', loginButton);
    
    if (loginButton) {
        loginButton.addEventListener('click', async function(e) {
            e.preventDefault();
            console.log('Login button clicked!');
            
            // Get form inputs
            const emailInput = loginForm.querySelector('input[name="Email"]');
            const passwordInput = loginForm.querySelector('input[name="Password"]');
            
            const email = emailInput.value.trim();
            const password = passwordInput.value.trim();
            
            console.log('Email:', email);
            console.log('Password length:', password.length);
            
            // Basic validation
            if (!email) {
                alert('Please enter your email address');
                emailInput.focus();
                return;
            }
            
            if (!password) {
                alert('Please enter your password');
                passwordInput.focus();
                return;
            }
            
            // Email format validation
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
                alert('Please enter a valid email address');
                emailInput.focus();
                return;
            }
            
            // Disable button and show loading state
            loginButton.disabled = true;
            loginButton.textContent = 'Logging in...';
            
            try {
                const csrfToken = getCSRFToken();
                console.log('CSRF Token:', csrfToken);
                
                if (!csrfToken) {
                    alert('Security token not found. Please refresh the page.');
                    loginButton.disabled = false;
                    loginButton.textContent = 'LOG IN';
                    return;
                }
                
                console.log('Sending login request...');
                
                const response = await fetch('/login/', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRFToken': csrfToken
                    },
                    credentials: 'same-origin',
                    body: JSON.stringify({
                        email: email,
                        password: password
                    })
                });
                
                console.log('Response status:', response.status);
                
                const data = await response.json();
                console.log('Response data:', data);
                
                if (data.success) {
                    alert('Login successful! Welcome ' + data.username);
                    // Redirect to main page
                    window.location.href = data.redirect_url || '/';
                } else {
                    alert(data.message || 'Login failed. Please try again.');
                    loginButton.disabled = false;
                    loginButton.textContent = 'LOG IN';
                }
            } catch (error) {
                console.error('Login error:', error);
                alert('An error occurred during login. Please try again.');
                loginButton.disabled = false;
                loginButton.textContent = 'LOG IN';
            }
        });
    } else {
        console.error('Login button not found!');
    }
});

// ============= REGISTRATION FUNCTIONALITY =============
document.addEventListener('DOMContentLoaded', function() {
    console.log('Page loaded, initializing registration...');
    
    const registerForm = document.querySelector('.form-box.register form');
    const registerButton = registerForm.querySelector('button[name="register"]');
    
    console.log('Register button found:', registerButton);
    
    if (registerButton) {
        registerButton.addEventListener('click', async function(e) {
            e.preventDefault();
            console.log('Register button clicked!');
            
            // Get all form inputs
            const fullNameInput = registerForm.querySelector('input[name="Full Name"]');
            const emailInput = registerForm.querySelector('input[name="Email"]');
            const phoneInput = registerForm.querySelector('input[name="Phone Number"]');
            const passwordInput = registerForm.querySelector('input[name="Password"]');
            const roleSelect = registerForm.querySelector('select[name="Role"]');
            
            const fullName = fullNameInput.value.trim();
            const email = emailInput.value.trim();
            const phone = phoneInput.value.trim();
            const password = passwordInput.value.trim();
            const role = roleSelect.value;
            
            console.log('Full Name:', fullName);
            console.log('Email:', email);
            console.log('Phone:', phone);
            console.log('Password length:', password.length);
            console.log('Role:', role);
            
            // NAME VALIDATION
            if (!fullName || fullName.length < 2) {
                alert('Please enter a valid name (at least 2 characters)');
                fullNameInput.focus();
                return;
            }
            
            // E-MAIL VALIDATION
            if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
                alert('Please enter a valid email address');
                emailInput.focus();
                return;
            }
            
            // PHONE NUMBER VALIDATION
            if (!phone || !/^\d{10}$/.test(phone)) {
                alert('Please enter a valid 10-digit phone number');
                phoneInput.focus();
                return;
            }
            
            // PASSWORD VALIDATION
            if (!password || password.length < 6) {
                alert('Password must be at least 6 characters long');
                passwordInput.focus();
                return;
            }
            
            // ROLE VALIDATION
            if (!role || role === "") {
                alert('Please select a role');
                roleSelect.focus();
                return;
            }
            
            // Disable button and show loading state
            registerButton.disabled = true;
            registerButton.textContent = 'Registering...';
            
            try {
                const csrfToken = getCSRFToken();
                console.log('CSRF Token:', csrfToken);
                
                if (!csrfToken) {
                    alert('Security token not found. Please refresh the page.');
                    registerButton.disabled = false;
                    registerButton.textContent = 'REGISTER';
                    return;
                }
                
                console.log('Sending registration request...');
                
                const response = await fetch('/register/', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRFToken': csrfToken
                    },
                    credentials: 'same-origin',
                    body: JSON.stringify({
                        full_name: fullName,
                        email: email,
                        phone_number: phone,
                        password: password,
                        role: role
                    })
                });
                
                console.log('Response status:', response.status);
                
                const data = await response.json();
                console.log('Response data:', data);
                
                if (data.success) {
                    alert(data.message || 'Registration successful!');
                    
                    // Clear form
                    registerForm.reset();
                    
                    // Switch to login form
                    container.classList.remove('active');
                    
                    // Re-enable button
                    registerButton.disabled = false;
                    registerButton.textContent = 'REGISTER';
                } else {
                    alert(data.message || 'Registration failed. Please try again.');
                    registerButton.disabled = false;
                    registerButton.textContent = 'REGISTER';
                }
            } catch (error) {
                console.error('Registration error:', error);
                alert('An error occurred during registration. Please try again.');
                registerButton.disabled = false;
                registerButton.textContent = 'REGISTER';
            }
        });
    } else {
        console.error('Register button not found!');
    }
});

// ============= SOCIAL MEDIA LOGIN PLACEHOLDERS =============
document.addEventListener('DOMContentLoaded', function() {
    const socialIcons = document.querySelectorAll('.social-icons a');
    
    socialIcons.forEach(icon => {
        icon.addEventListener('click', function(e) {
            e.preventDefault();
            const platform = this.className;
            alert(`${platform.charAt(0).toUpperCase() + platform.slice(1)} login coming soon!`);
        });
    });
});
