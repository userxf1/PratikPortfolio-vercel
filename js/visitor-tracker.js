document.addEventListener('DOMContentLoaded', function() {
    'use strict';

    const API_BASE_URL = '/api';
    const visitorCountElement = document.getElementById('visitor-count');

    // Generate or retrieve visitor ID
    function generateUUID() {
        return ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c =>
            (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
        );
    }

    let visitorId = localStorage.getItem('visitorId');
    if (!visitorId) {
        visitorId = generateUUID();
        localStorage.setItem('visitorId', visitorId);
    }

    // Get browser info
    function getBrowserInfo() {
        const ua = navigator.userAgent;
        let browser = 'Unknown';
        if (ua.includes('Chrome')) browser = 'Chrome';
        else if (ua.includes('Firefox')) browser = 'Firefox';
        else if (ua.includes('Safari')) browser = 'Safari';
        else if (ua.includes('Edge')) browser = 'Edge';
        else if (ua.includes('Opera')) browser = 'Opera';
        return browser;
    }

    // Get device info
    function getDeviceInfo() {
        const ua = navigator.userAgent;
        if (/mobile/i.test(ua)) return 'Mobile';
        if (/tablet/i.test(ua)) return 'Tablet';
        return 'Desktop';
    }

    // Record page view
    function recordPageView() {
        const timestamp = Date.now();
        const page = window.location.pathname;
        const browser = getBrowserInfo();
        const device = getDeviceInfo();
        const screenSize = `${window.screen.width}x${window.screen.height}`;

        // Update visitor info
        fetch(`${API_BASE_URL}/visitors`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                id: visitorId,
                timestamp,
                browser,
                device,
                screenSize
            })
        })
        .catch(error => {
            console.error('Error recording visitor:', error);
            // Fallback to localStorage
            const visitors = JSON.parse(localStorage.getItem('portfolio_visitors')) || [];
            const existingVisitor = visitors.find(v => v.id === visitorId);
            if (existingVisitor) {
                existingVisitor.visits += 1;
                existingVisitor.timestamp = timestamp;
                existingVisitor.browser = browser;
                existingVisitor.device = device;
                existingVisitor.screenSize = screenSize;
            } else {
                visitors.push({ id: visitorId, timestamp, visits: 1, browser, device, screenSize });
            }
            localStorage.setItem('portfolio_visitors', JSON.stringify(visitors));
        });

        // Record page view
        fetch(`${API_BASE_URL}/pageviews`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ visitorId, page, timestamp })
        })
        .catch(error => {
            console.error('Error recording page view:', error);
            const pageViews = JSON.parse(localStorage.getItem('portfolio_pageviews')) || [];
            pageViews.push({ visitorId, page, timestamp });
            localStorage.setItem('portfolio_pageviews', JSON.stringify(pageViews));
        });
    }

    // Update visitor count in UI
    function updateVisitorCount() {
        fetch(`${API_BASE_URL}/visitors/count`)
            .then(response => response.json())
            .then(data => {
                if (visitorCountElement) {
                    visitorCountElement.textContent = data.count;
                    visitorCountElement.classList.add('pulse');
                    setTimeout(() => visitorCountElement.classList.remove('pulse'), 1000);
                }
            })
            .catch(error => {
                console.error('Error fetching visitor count:', error);
                const pageViews = JSON.parse(localStorage.getItem('portfolio_pageviews')) || [];
                if (visitorCountElement) {
                    visitorCountElement.textContent = pageViews.length;
                    visitorCountElement.style.color = 'orange';
                    visitorCountElement.title = 'Using local data due to server issue';
                }
            });
    }

    // Record session duration
    function recordSessionDuration() {
        const startTime = Date.now();
        window.addEventListener('beforeunload', () => {
            const duration = Math.round((Date.now() - startTime) / 1000); // Duration in seconds
            fetch(`${API_BASE_URL}/sessions`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ visitorId, duration, timestamp: Date.now() })
            })
            .catch(error => {
                console.error('Error recording session duration:', error);
                const sessionDurations = JSON.parse(localStorage.getItem('portfolio_sessionDurations')) || [];
                sessionDurations.push({ visitorId, duration, timestamp: Date.now() });
                localStorage.setItem('portfolio_sessionDurations', JSON.stringify(sessionDurations));
            });
        });
    }

    // Initialize tracking
    recordPageView();
    updateVisitorCount();
    recordSessionDuration();
});
