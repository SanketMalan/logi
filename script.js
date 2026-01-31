document.addEventListener("DOMContentLoaded", () => {
  // Navbar Scroll Effect
  const header = document.getElementById("header");

  window.addEventListener("scroll", () => {
    if (window.scrollY > 50) {
      header.classList.add("scrolled");
    } else {
      header.classList.remove("scrolled");
    }
  });

  // Mobile Menu Toggle
  const menuToggle = document.querySelector(".menu-toggle");
  const navLinks = document.querySelector(".nav-links");

  if (menuToggle) {
    menuToggle.addEventListener("click", () => {
      navLinks.classList.toggle("active");
      const icon = menuToggle.querySelector("i");
      if (navLinks.classList.contains("active")) {
        icon.classList.remove("ri-menu-4-line");
        icon.classList.add("ri-close-line");
      } else {
        icon.classList.remove("ri-close-line");
        icon.classList.add("ri-menu-4-line");
      }
    });
  }

  // Close mobile menu when clicking a link
  document.querySelectorAll(".nav-links a").forEach((link) => {
    link.addEventListener("click", () => {
      navLinks.classList.remove("active");
      const icon = menuToggle.querySelector("i");
      icon.classList.remove("ri-close-line");
      icon.classList.add("ri-menu-4-line");
    });
  });

  // Simulated Tracking Logic
  const trackingForm = document.getElementById("tracking-form");
  const trackingResult = document.getElementById("tracking-result");

  if (trackingForm) {
    trackingForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const trackId = document.getElementById("track-id").value;

      // Simulate loading
      const btn = trackingForm.querySelector("button");
      const originalText = btn.innerHTML;
      btn.innerHTML = '<i class="ri-loader-4-line ri-spin"></i> Tracking...';
      btn.disabled = true;

      setTimeout(() => {
        btn.innerHTML = originalText;
        btn.disabled = false;

        showTrackingResult(trackId);
      }, 1500);
    });
  }

  function showTrackingResult(id) {
    trackingResult.classList.remove("hidden");

        // Randomize status for demo (India Context)
        const statuses = [
            { stage: 'Order Placed', date: 'Oct 24, 10:00 AM', location: 'Merchant Warehouse, Mumbai', active: true },
            { stage: 'Picked Up', date: 'Oct 24, 04:30 PM', location: 'Bhiwandi Hub, Maharashtra', active: true },
            { stage: 'In Transit', date: 'Oct 25, 09:15 AM', location: 'Sorting Center, New Delhi', active: true },
            { stage: 'Out for Delivery', date: 'Today, 08:00 AM', location: 'Local Hub, Bangalore', active: true },
            { stage: 'Delivered', date: 'Estimated: Today, 02:00 PM', location: 'Whitefield, Bangalore', active: false }
        ];

        let html = `<h4>Tracking ID: <span class="text-accent">${id}</span></h4><div class="status-list" style="margin-top:15px;">`;

        statuses.forEach((status, index) => {
            html += `
                <div class="status-item ${status.active ? 'active' : ''}">
                    <div class="status-label">${status.stage}</div>
                    <div class="status-location" style="font-size:0.85rem; color: var(--text-muted);">${status.location}</div>
                    <div class="status-date" style="font-size:0.8rem; color: #94a3b8;">${status.date}</div>
                </div>
            `;
        });

    html += "</div>";
    trackingResult.innerHTML = html;
  }

  // Scroll Animation Observer
  const observerOptions = {
    threshold: 0.1,
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.style.opacity = "1";
        entry.target.style.transform = "translateY(0)";
        observer.unobserve(entry.target);
      }
    });
  }, observerOptions);

  document.querySelectorAll(".reveal").forEach((el) => {
    el.style.opacity = "0";
    el.style.transform = "translateY(30px)";
    el.style.transition = "opacity 0.8s ease, transform 0.8s ease";
    observer.observe(el);
  });

    // 3D Tilt Effect for Market Cards
    const cards = document.querySelectorAll('.tilt-card');
    
    cards.forEach(card => {
        card.addEventListener('mousemove', (e) => {
            const rect = card.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            const centerX = rect.width / 2;
            const centerY = rect.height / 2;
            
            const rotateX = ((y - centerY) / centerY) * -10; // Max rotation 10deg
            const rotateY = ((x - centerX) / centerX) * 10;

            card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`;
        });

        card.addEventListener('mouseleave', () => {
            card.style.transform = 'perspective(1000px) rotateX(0) rotateY(0) scale3d(1, 1, 1)';
        });
    });
    // Rate Calculator Logic
    window.calculateRate = function(event) {
        event.preventDefault();
        
        const weight = parseFloat(document.getElementById('calc-weight').value);
        const service = document.getElementById('calc-service').value;
        const origin = document.getElementById('calc-origin').value;
        const dest = document.getElementById('calc-dest').value;
        
        // Validations
        if (!weight || !origin || !dest) return;
        
        // Mock Calculation Logic
        let baseRate = 50; // Base cost
        let ratePerKg = service === 'express' ? 40 : 15;
        let distanceFactor = Math.abs(parseInt(origin.substring(0,2)) - parseInt(dest.substring(0,2))) * 0.5; 
        if(isNaN(distanceFactor)) distanceFactor = 1;

        let totalCost = baseRate + (weight * ratePerKg) + (distanceFactor * 10);
        totalCost = Math.round(totalCost);

        // Delivery Time Estimation
        let days = service === 'express' ? '1-2 Days' : '3-5 Days';
        if(distanceFactor > 20) days = service === 'express' ? '2-3 Days' : '5-7 Days';

        // Display Result
        const resultDiv = document.getElementById('calc-result');
        const costSpan = document.getElementById('result-cost');
        const timeSpan = document.getElementById('result-time');
        
        costSpan.innerText = '₹' + totalCost;
        timeSpan.innerText = days;
        
        resultDiv.style.display = 'flex';
    };

    // Check Login State for Navbar
    const loginBtn = document.querySelector('.btn-login-nav');
    const isHomePage = window.location.pathname === '/' || window.location.pathname.endsWith('index.html');
    
    if (loginBtn && localStorage.getItem('isLoggedIn') === 'true' && !isHomePage) {
        loginBtn.innerText = 'Dashboard';
        loginBtn.href = 'dashboard.html';
        loginBtn.classList.add('btn-dashboard-active');
        
        // Optional: Update Sign Up button to Logout or hide it
        const signUpBtn = document.querySelector('a[href="signup.html"].btn-auth-nav');
        if(signUpBtn) {
            signUpBtn.style.display = 'none';
        }
    }
});
