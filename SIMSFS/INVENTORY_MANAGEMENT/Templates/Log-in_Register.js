const container  = document.querySelector('.container');
const registerBtn = document.querySelector('.register-btn');
const loginBtn = document.querySelector('.login-btn');

registerBtn.addEventListener('click', () => {
    container.classList.add('active');
})

loginBtn.addEventListener('click', () => {
    container.classList.remove('active');
})

document.addEventListener('DOMContentLoaded', function() 
{
    const form = document.querySelector('.form-box.register form');
    
    if (form) {
        form.addEventListener('submit', async function(e) 
        {
            e.preventDefault();
            
            // GET ALL INPUTS FROM THE TEXTFIELDS-INPUT
            const name = document.querySelector('input[name="Full Name"]').value.trim();
            const email = document.querySelector('input[name="Email"]').value.trim();
            const phone = document.querySelector('input[name="Phone Number"]').value.trim();
            const password = document.querySelector('input[name="Password"]').value.trim();
            const role = document.querySelector('select[name="Role"]').value;

            // NAME VALIDATION
            if (!name || name.length < 2) {
                alert('PLEASE ENTER A VALID NAME (at least 2 characters)');
                return;
            }
            
            // E-MAIL VALIDATION    
            if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
                alert('PLEASE ENTER A VALID E-MAIL ADDRESS');
                return;
            }

            // PHONE NUMBER VALIDATION 
            if (!phone || !/^\d{10}$/.test(phone)) {
                alert('PLEASE ENTER A VALID 10-DIGIT PHONE NUMBER');
                return;
            }

            // PASSWORD VALIDATION
            if (!password || password.length < 6) {
                alert('PASSWORD MUST BE AT LEAST 6 CHARACTERS LONG');
                return;
            }
            
            // ROLE VALIDATION 
            if (!role || role === "") {
                alert('PLEASE SELECT A ROLE');
                return;
            }

            // If all validations pass, you can proceed with form submission
            console.log('Form validated successfully!');
            console.log({
                name: name,
                email: email,
                phone: phone,
                password: password,
                role: role
            });

            // HERE YOU CAN ADD YOUR DJANGO BACKEND SUBMISSION LOGIC
            // For example, using fetch API to submit to Django backend
        
            try {
                const response = await fetch('/register/', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRFToken': getCookie('csrftoken') // Django CSRF token
                    },
                    body: JSON.stringify({
                        full_name: name,
                        email: email,
                        phone_number: phone,
                        password: password,
                        role: role
                    })
                });

                if (response.ok) {
                    alert('Registration successful!');
                    // Redirect or clear form
                } else {
                    alert('Registration failed. Please try again.');
                }
            } catch (error) {
                console.error('Error:', error);
                alert('An error occurred during registration.');
            }
            
        });
    }
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
