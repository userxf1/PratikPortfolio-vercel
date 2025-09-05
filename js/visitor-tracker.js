/*---------------------------------------------
 * Visitor Tracking JavaScript
 * Records site visitors and page views to Neon Database
 *--------------------------------------------*/

document.addEventListener('DOMContentLoaded', function() {
    'use strict';
    
    // DOM elements
    const visitorCountElement = document.getElementById('visitor-count');
    
    // API endpoint (using current domain and port 3000 for the API)
   const API_BASE_URL = '/api';
    
    // Initialize tracking
    initVisitorTracking();
    
    /**
     * Initialize visitor tracking
     */
    function initVisitorTracking() {
        // Generate or retrieve visitor ID
        const visitorId = getVisitorId();
        
        // Record this visit
        recordVisit(visitorId);
        
        // Update visitor count in the UI
        updateVisitorCount();
        
        // Start session timer
        startSessionTimer(visitorId);
        
        // Record page view
        recordPageView(visitorId);
    }
    
    /**
     * Generate or retrieve a unique visitor ID
     */
    function getVisitorId() {
        // Check if visitor already has an ID in localStorage
        let visitorId = localStorage.getItem('portfolio_visitor_id');
        
        // If no ID exists, generate a new one
        if (!visitorId) {
            visitorId = generateUUID();
            localStorage.setItem('portfolio_visitor_id', visitorId);
        }
        
        return visitorId;
    }
    
    /**
     * Generate a UUID v4 (random)
     */
    function generateUUID() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }
    
    /**
     * Record a visitor to Neon database and localStorage
     */
    function recordVisit(visitorId) {
        // Get browser and device info
        const browserInfo = detectBrowser();
        const deviceInfo = detectDevice();
        const screenSize = window.innerWidth + 'x' + window.innerHeight;
        const timestamp = new Date().getTime();
        
        // Save to localStorage for backup and local tracking
        saveVisitorToLocalStorage(visitorId, timestamp, browserInfo, deviceInfo, screenSize);
        
        // Send to API
        fetch(`${API_BASE_URL}/visitors`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                id: visitorId,
                timestamp: timestamp,
                browser: browserInfo,
                device: deviceInfo,
                screenSize: screenSize
            })
        })
        .catch(error => {
            console.error('Error recording visitor to database:', error);
        });
    }
    
    /**
     * Save visitor data to localStorage as backup
     */
    function saveVisitorToLocalStorage(visitorId, timestamp, browserInfo, deviceInfo, screenSize) {
        // Get existing visitors array from localStorage
        const visitors = JSON.parse(localStorage.getItem('portfolio_visitors')) || [];
        
        // Check if this visitor is already recorded
        const existingVisitor = visitors.find(visitor => visitor.id === visitorId);
        
        // If visitor exists, update last visit
        if (existingVisitor) {
            existingVisitor.timestamp = timestamp;
            existingVisitor.visits++;
            existingVisitor.browser = browserInfo;
            existingVisitor.device = deviceInfo;
            existingVisitor.screenSize = screenSize;
        } else {
            // Otherwise add a new visitor
            visitors.push({
                id: visitorId,
                timestamp: timestamp,
                visits: 1,
                browser: browserInfo,
                device: deviceInfo,
                screenSize: screenSize
            });
        }
        
        // Save back to localStorage
        localStorage.setItem('portfolio_visitors', JSON.stringify(visitors));
    }
    
    /**
     * Update the visitor count in UI
     */
    function updateVisitorCount() {
        // Fetch count from API
        fetch(`${API_BASE_URL}/visitors/count`)
            .then(response => response.json())
            .then(data => {
                if (visitorCountElement) {
                    visitorCountElement.textContent = data.count;
                    
                    // Add animation effect to the count
                    visitorCountElement.classList.add('pulse');
                    setTimeout(() => {
                        visitorCountElement.classList.remove('pulse');
                    }, 1000);
                }
            })
            .catch(error => {
                console.error('Error fetching visitor count:', error);
                
                // Fallback to localStorage if API fails
                const visitors = JSON.parse(localStorage.getItem('portfolio_visitors')) || [];
                if (visitorCountElement) {
                    visitorCountElement.textContent = visitors.length;
                }
            });
    }
    
    /**
     * Start a session timer to record visit duration
     */
    function startSessionTimer(visitorId) {
        // Record session start time
        const sessionStart = new Date().getTime();
        localStorage.setItem('portfolio_session_start', sessionStart);
        
        // Set up event listener for when user leaves the page
        window.addEventListener('beforeunload', function() {
            // Calculate session duration
            const sessionEnd = new Date().getTime();
            const sessionDuration = Math.round((sessionEnd - sessionStart) / 1000); // in seconds
            
            // Only record if session was at least 5 seconds (avoid bounces)
            if (sessionDuration >= 5) {
                // Save to localStorage as backup
                const sessionDurations = JSON.parse(localStorage.getItem('portfolio_sessionDurations')) || [];
                sessionDurations.push(sessionDuration);
                localStorage.setItem('portfolio_sessionDurations', JSON.stringify(sessionDurations));
                
                // Send to API (using navigator.sendBeacon for reliable sending during page unload)
                const data = {
                    visitorId: visitorId,
                    duration: sessionDuration,
                    timestamp: sessionEnd
                };
                
                // Use sendBeacon if available, otherwise use fetch
                if (navigator.sendBeacon) {
                    navigator.sendBeacon(`${API_BASE_URL}/sessions`, JSON.stringify(data));
                } else {
                    fetch(`${API_BASE_URL}/sessions`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify(data),
                        keepalive: true
                    });
                }
            }
        });
    }
    
    /**
     * Record a page view
     */
    function recordPageView(visitorId) {
        // Get current page
        const currentPage = window.location.pathname || '/';
        const timestamp = new Date().getTime();
        
        // Save to localStorage for backup
        const pageViews = JSON.parse(localStorage.getItem('portfolio_pageviews')) || [];
        pageViews.push({
            visitorId: visitorId,
            page: currentPage,
            timestamp: timestamp
        });
        localStorage.setItem('portfolio_pageviews', JSON.stringify(pageViews));
        
        // Send to API
        fetch(`${API_BASE_URL}/pageviews`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                visitorId: visitorId,
                page: currentPage,
                timestamp: timestamp
            })
        })
        .catch(error => {
            console.error('Error recording page view to database:', error);
        });
    }
    
    /**
     * Detect browser information
     */
    function detectBrowser() {
        const userAgent = navigator.userAgent;
        let browserName = "Unknown";
        
        if (userAgent.indexOf("Firefox") > -1) {
            browserName = "Firefox";
        } else if (userAgent.indexOf("Opera") > -1 || userAgent.indexOf("OPR") > -1) {
            browserName = "Opera";
        } else if (userAgent.indexOf("Trident") > -1) {
            browserName = "Internet Explorer";
        } else if (userAgent.indexOf("Edge") > -1) {
            browserName = "Edge";
        } else if (userAgent.indexOf("Chrome") > -1) {
            browserName = "Chrome";
        } else if (userAgent.indexOf("Safari") > -1) {
            browserName = "Safari";
        }
        
        return browserName;
    }
    
    /**
     * Detect device type
     */
    function detectDevice() {
        const userAgent = navigator.userAgent;
        
        if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent)) {
            if (/iPad|tablet|Tablet/i.test(userAgent)) {
                return "Tablet";
            }
            return "Mobile";
        }
        
        return "Desktop";
    }
    
    // Add CSS animation
    const style = document.createElement('style');
    style.textContent = `
        @keyframes pulse {
            0% { transform: scale(1); }
            50% { transform: scale(1.2); }
            100% { transform: scale(1); }
        }
        
        .pulse {
            animation: pulse 1s ease-in-out;
        }
    `;
    document.head.appendChild(style);
});
