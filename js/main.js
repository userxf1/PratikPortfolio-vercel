/*---------------------------------------------
 * Main JavaScript File
 * Handles core functionality of the website
 *--------------------------------------------*/

document.addEventListener('DOMContentLoaded', function() {
    'use strict';
    
    // Wait for window to load
    window.onload = function() {
        // Hide preloader once page is fully loaded
        const preloader = document.querySelector('.preloader');
        preloader.classList.add('hide');
        
        // Start animations
        initRevealAnimations();
        
        // Init skill progress bars
        initSkillBars();
        
        // Init stat counters
        initCounters();
        
        // Initialize the help bot
        initHelpBot();
    };
    
    // Get all DOM elements
    const header = document.getElementById('header');
    const hamburger = document.querySelector('.hamburger');
    const mobileNav = document.querySelector('.mobile-nav');
    const mobileNavLinks = document.querySelectorAll('.mobile-nav-link');
    const navLinks = document.querySelectorAll('.nav-link');
    const sections = document.querySelectorAll('section');
    const filterBtns = document.querySelectorAll('.filter-btn');
    const projectCards = document.querySelectorAll('.project-card');
    const contactForm = document.getElementById('contact-form');
    const formMessage = document.getElementById('form-message');
    
    // Initialize custom cursor
    initCustomCursor();
    
    // Header scroll event
    window.addEventListener('scroll', function() {
        // Add sticky class to header on scroll
        if (window.scrollY > 100) {
            header.classList.add('sticky');
        } else {
            header.classList.remove('sticky');
        }
        
        // Highlight active nav link based on scroll position
        let current = '';
        
        sections.forEach((section) => {
            const sectionTop = section.offsetTop - 100;
            const sectionHeight = section.clientHeight;
            if (scrollY >= sectionTop) {
                current = section.getAttribute('id');
            }
        });
        
        navLinks.forEach((link) => {
            link.classList.remove('active');
            if (link.getAttribute('href').slice(1) === current) {
                link.classList.add('active');
            }
        });
    });
    
    // Mobile menu toggle
    hamburger.addEventListener('click', function() {
        hamburger.classList.toggle('active');
        mobileNav.classList.toggle('active');
        document.body.classList.toggle('no-scroll');
    });
    
    // Close mobile menu on nav link click
    mobileNavLinks.forEach(link => {
        link.addEventListener('click', function() {
            hamburger.classList.remove('active');
            mobileNav.classList.remove('active');
            document.body.classList.remove('no-scroll');
        });
    });
    
    // Smooth scrolling for all navigation links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            
            const targetId = this.getAttribute('href');
            const targetElement = document.querySelector(targetId);
            
            if (targetElement) {
                window.scrollTo({
                    top: targetElement.offsetTop - 70,
                    behavior: 'smooth'
                });
            }
        });
    });
    
    // Projects filter functionality
    filterBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            // Remove active class from all buttons
            filterBtns.forEach(btn => btn.classList.remove('active'));
            // Add active class to clicked button
            this.classList.add('active');
            
            const filterValue = this.getAttribute('data-filter');
            
            projectCards.forEach(card => {
                if (filterValue === 'all' || card.getAttribute('data-category') === filterValue) {
                    card.style.display = 'block';
                    setTimeout(() => {
                        card.style.opacity = '1';
                        card.style.transform = 'translateY(0)';
                    }, 100);
                } else {
                    card.style.opacity = '0';
                    card.style.transform = 'translateY(20px)';
                    setTimeout(() => {
                        card.style.display = 'none';
                    }, 300);
                }
            });
        });
    });
    
    // Form submission handling
    if (contactForm && formMessage) {
        contactForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            // Clear previous messages
            formMessage.textContent = '';
            formMessage.className = 'form-message';
            
            // Get form data
            const formData = {
                name: document.getElementById('name').value.trim(),
                email: document.getElementById('email').value.trim(),
                subject: document.getElementById('subject').value.trim(),
                message: document.getElementById('message').value.trim()
            };
            
            // Validate form data
            if (!validateForm(formData)) {
                return;
            }
            
            // Show loading state
            const submitBtn = contactForm.querySelector('.submit-btn');
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';
            
            try {
                const response = await fetch('/api/contact', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(formData)
                });
                
                const result = await response.json();
                
                if (response.ok) {
                    formMessage.textContent = 'Your message has been sent successfully!';
                    formMessage.className = 'form-message success';
                    contactForm.reset();
                } else {
                    formMessage.textContent = result.message || 'Failed to send message. Please try again.';
                    formMessage.className = 'form-message error';
                }
            } catch (error) {
                console.error('Error submitting form:', error);
                formMessage.textContent = 'An error occurred. Please try again later.';
                formMessage.className = 'form-message error';
            } finally {
                submitBtn.disabled = false;
                submitBtn.innerHTML = '<span>Send Message</span><i class="fas fa-paper-plane"></i>';
            }
        });
    }
    
    // Initialize skill progress bars
    function initSkillBars() {
        const progressBars = document.querySelectorAll('.progress-bar');
        
        progressBars.forEach(bar => {
            const percent = bar.getAttribute('data-percent');
            
            // Use IntersectionObserver to trigger animation when bar is in view
            const observer = new IntersectionObserver(entries => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        setTimeout(() => {
                            bar.style.width = percent + '%';
                        }, 400);
                        observer.unobserve(bar);
                    }
                });
            }, { threshold: 0.5 });
            
            observer.observe(bar);
        });
    }
    
    // Initialize stat counters
    function initCounters() {
        const counters = document.querySelectorAll('.counter');
        
        counters.forEach(counter => {
            const target = +counter.getAttribute('data-target');
            
            // Use IntersectionObserver to trigger animation when counter is in view
            const observer = new IntersectionObserver(entries => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        counter.innerText = '0';
                        
                        const updateCounter = () => {
                            const c = +counter.innerText;
                            const increment = target / 20;
                            
                            if (c < target) {
                                counter.innerText = Math.ceil(c + increment);
                                setTimeout(updateCounter, 100);
                            } else {
                                counter.innerText = target;
                            }
                        };
                        
                        updateCounter();
                        observer.unobserve(counter);
                    }
                });
            }, { threshold: 0.5 });
            
            observer.observe(counter);
        });
    }
    
    // Form validation function
    function validateForm(data) {
        // Clear previous error messages
        formMessage.textContent = '';
        formMessage.className = 'form-message';
        
        // Validate name (at least 2 characters)
        if (data.name.length < 2) {
            formMessage.textContent = 'Name must be at least 2 characters';
            formMessage.className = 'form-message error';
            return false;
        }
        
        // Validate email
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(data.email)) {
            formMessage.textContent = 'Please enter a valid email address';
            formMessage.className = 'form-message error';
            return false;
        }
        
        // Validate subject (at least 3 characters)
        if (data.subject.length < 3) {
            formMessage.textContent = 'Subject must be at least 3 characters';
            formMessage.className = 'form-message error';
            return false;
        }
        
        // Validate message (at least 10 characters)
        if (data.message.length < 10) {
            formMessage.textContent = 'Message must be at least 10 characters';
            formMessage.className = 'form-message error';
            return false;
        }
        
        return true;
    }
    
    // Initialize custom cursor
    function initCustomCursor() {
        const cursor = document.querySelector('.cursor');
        const cursorFollower = document.querySelector('.cursor-follower');
        
        // Only enable custom cursor on desktop
        if (window.innerWidth > 768) {
            // Hide default cursor
            document.body.style.cursor = 'none';
            
            // Move custom cursor with mouse
            document.addEventListener('mousemove', function(e) {
                cursor.style.left = e.clientX + 'px';
                cursor.style.top = e.clientY + 'px';
                
                // Follower with slight delay
                setTimeout(function() {
                    cursorFollower.style.left = e.clientX + 'px';
                    cursorFollower.style.top = e.clientY + 'px';
                }, 70);
            });
            
            // Cursor effects for links & buttons
            document.querySelectorAll('a, button, .project-card, .skill-item, .filter-btn, input, textarea').forEach(item => {
                item.addEventListener('mouseenter', function() {
                    cursor.style.width = '0';
                    cursor.style.height = '0';
                    cursorFollower.style.width = '40px';
                    cursorFollower.style.height = '40px';
                    cursorFollower.style.borderColor = 'var(--primary-color)';
                    cursorFollower.style.backgroundColor = 'rgba(157, 78, 221, 0.1)';
                });
                
                item.addEventListener('mouseleave', function() {
                    cursor.style.width = '10px';
                    cursor.style.height = '10px';
                    cursorFollower.style.width = '30px';
                    cursorFollower.style.height = '30px';
                    cursorFollower.style.borderColor = 'var(--primary-light)';
                    cursorFollower.style.backgroundColor = 'transparent';
                });
            });
        } else {
            // Hide custom cursor on mobile/tablet
            cursor.style.display = 'none';
            cursorFollower.style.display = 'none';
        }
    }
    
    // Initialize reveal animations
    function initRevealAnimations() {
        const revealElements = document.querySelectorAll('.reveal-text');
        
        const revealObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('active');
                    observer.unobserve(entry.target);
                }
            });
        }, {
            threshold: 0.15,
            rootMargin: '0px 0px -50px 0px'
        });
        
        revealElements.forEach(element => {
            revealObserver.observe(element);
        });
    }
    
    // Initialize help bot
    function initHelpBot() {
        const helpBot = document.querySelector('.help-bot');
        const helpBotButton = document.querySelector('.help-bot-button');
        const helpBotCloseButton = document.querySelector('.help-bot-close');
        const helpBotContainer = document.querySelector('.help-bot-container');
        const helpBotInput = document.getElementById('bot-input');
        const sendButton = document.querySelector('.send-button');
        const helpBotMessages = document.querySelector('.help-bot-messages');
        
        // Response database - simple question/answer pairs
        const botResponses = {
            'hi': 'Hello! How can I help you today?',
            'hello': 'Hi there! How can I assist you?',
            'hey': 'Hey! What can I do for you?',
            
            'who are you': 'I\'m a portfolio assistant bot. I can help answer questions about this portfolio, skills, and projects.',
            'what is this': 'This is a professional portfolio website showcasing my work, skills, and experience as a frontend developer.',
            'what do you do': 'I\'m here to help visitors navigate this portfolio and answer questions about my skills, projects, and experience.',
            
            'contact': 'You can get in touch through the contact form in the Contact section, or directly via email at ashishkumarsinghhhh@gmail.com.',
            'email': 'You can reach me at ashishkumarsinghhhh@gmail.com',
            'phone': 'For contact information, please check the Contact section or send me an email.',
            
            'projects': 'I have worked on various web development projects. You can check them out in the Projects section of this portfolio.',
            'work': 'My work includes various web development projects. Visit the Projects section to see some examples.',
            'portfolio': 'My portfolio showcases various web development projects with different technologies. Feel free to browse through the Projects section.',
            
            'skills': 'My skills include HTML5, CSS3, JavaScript, React, Sass, Bootstrap, Git, and more. Check the Skills section for a comprehensive list.',
            'technologies': 'I work with HTML5, CSS3, JavaScript, React, Sass, Bootstrap, Git, and various other web technologies.',
            'tech stack': 'My tech stack primarily includes HTML5, CSS3, JavaScript, and modern frameworks/libraries like React.',
            
            'experience': 'I have 2+ years of experience in frontend development, working on various projects for different clients and industries.',
            'background': 'I have a background in web development with 2+ years of experience, specializing in creating responsive and interactive websites.',
            
            'resume': 'You can download my resume using the "Download Resume" button in the Home section.',
            'cv': 'My CV is available for download in the Home section. Just click on the "Download Resume" button.',
            
            'services': 'I offer web development services including responsive website creation, web application development, and UI/UX improvements.',
            'hire': 'I am available for freelance work and full-time opportunities. Please contact me through the Contact section for potential collaborations.',
            'freelance': 'Yes, I am available for freelance projects. Feel free to contact me with your project details.',
            
            'thanks': 'You\'re welcome! Is there anything else you\'d like to know?',
            'thank you': 'Happy to help! Let me know if you have any other questions.',
            
            'bye': 'Goodbye! Feel free to reach out if you have more questions later.',
            'goodbye': 'Bye! Have a great day!',
        };
        
        // Default responses for unknown queries
        const defaultResponses = [
            "I'm not sure I understand. Could you try rephrasing your question?",
            "I don't have information on that. Would you like to know about my skills, projects, or contact information?",
            "I don't have an answer for that. Try asking about my skills, experience, or projects instead.",
            "I'm afraid I can't help with that. Would you like to know more about my work or skills?"
        ];
        
        // Toggle bot visibility
        helpBotButton.addEventListener('click', function() {
            helpBot.classList.toggle('active');
            if (helpBot.classList.contains('active')) {
                helpBotInput.focus();
            }
        });
        
        // Close bot
        helpBotCloseButton.addEventListener('click', function() {
            helpBot.classList.remove('active');
        });
        
        // Send message on enter key
        helpBotInput.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') {
                sendMessage();
            }
        });
        
        // Send message on button click
        sendButton.addEventListener('click', function() {
            sendMessage();
        });
        
        // Function to send user message and get bot response
        function sendMessage() {
            const userMessage = helpBotInput.value.trim();
            
            if (userMessage === '') return;
            
            // Add user message to chat
            addMessageToChat('user', userMessage);
            
            // Clear input
            helpBotInput.value = '';
            
            // Simulate bot "typing" and then respond
            setTimeout(() => {
                const botResponse = getBotResponse(userMessage);
                addMessageToChat('bot', botResponse);
                
                // Scroll to bottom
                helpBotMessages.scrollTop = helpBotMessages.scrollHeight;
            }, 1000);
        }
        
        // Function to add message to chat
        function addMessageToChat(sender, message) {
            const messageDiv = document.createElement('div');
            messageDiv.className = sender === 'user' ? 'user-message' : 'bot-message';
            
            const avatarDiv = document.createElement('div');
            avatarDiv.className = sender === 'user' ? 'user-avatar' : 'bot-avatar';
            
            const icon = document.createElement('i');
            icon.className = sender === 'user' ? 'fas fa-user' : 'fas fa-robot';
            avatarDiv.appendChild(icon);
            
            const contentDiv = document.createElement('div');
            contentDiv.className = 'message-content';
            
            const paragraph = document.createElement('p');
            paragraph.textContent = message;
            contentDiv.appendChild(paragraph);
            
            messageDiv.appendChild(avatarDiv);
            messageDiv.appendChild(contentDiv);
            
            helpBotMessages.appendChild(messageDiv);
            
            // Scroll to bottom
            helpBotMessages.scrollTop = helpBotMessages.scrollHeight;
        }
        
        // Function to get bot response based on user input
        function getBotResponse(userInput) {
            // Convert to lowercase for case-insensitive matching
            const input = userInput.toLowerCase();
            
            // Check for matches in our response database
            for (const key in botResponses) {
                if (input.includes(key)) {
                    return botResponses[key];
                }
            }
            
            // If no match found, return a random default response
            const randomIndex = Math.floor(Math.random() * defaultResponses.length);
            return defaultResponses[randomIndex];
        }
    }
});
