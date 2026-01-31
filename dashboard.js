// Auth Check
if (!localStorage.getItem("isLoggedIn")) {
  window.location.href = "login.html";
}

// --- Data Seeding & Management ---

const MOCK_DATA = {
  user: {
    name: "Alex Morgan",
    email: "alex.morgan@logismart.com",
    role: "Admin",
    avatar: "https://ui-avatars.com/api/?name=Alex+Morgan&background=0D8ABC&color=fff",
    notifications: { email: true, sms: false }
  },
  wallet: {
    balance: 0.00,
    spendingLimit: 200000,
    transactions: []
  },
  customers: [],
  shipments: []
};

function initData() {
  // Only initialize if data doesn't exist to ensure persistence
  if (!localStorage.getItem("logismart_data")) {
    localStorage.setItem("logismart_data", JSON.stringify(MOCK_DATA));
  }
}


function getData() {
  return JSON.parse(localStorage.getItem("logismart_data"));
}

function saveData(data) {
  localStorage.setItem("logismart_data", JSON.stringify(data));
}

function formatCurrency(amount) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount);
}

// --- Rendering Logic ---

document.addEventListener("DOMContentLoaded", () => {
  initData();
  const data = getData();
  
  renderGlobal(data);
  
  if (document.querySelector(".dashboard-container")) {
    const page = window.location.pathname.split("/").pop();
    
    if (page === "dashboard.html" || page === "") renderDashboardHome(data);
    if (page === "shipments.html") renderShipmentsPage(data);
    if (page === "create-shipment.html") setupCreateShipmentPage(data);
    if (page === "add-customer.html") setupAddCustomerPage(data);
    if (page === "kyc.html") setupKYCPage(data);
    if (page === "customers.html") renderCustomersPage(data);
    if (page === "wallet.html") renderWalletPage(data);
    if (page === "analytics.html") renderAnalyticsPage(data);
    if (page === "settings.html") renderSettingsPage(data);
  }

  setupLogout();
  setupSidebar();
});


function renderGlobal(data) {
  // Update user profile in sidebar/header if elements exist
  const profileNameEls = document.querySelectorAll(".profile-info .text h4");
  const profileImgEls = document.querySelectorAll(".profile-info img");
  
  profileNameEls.forEach(el => el.textContent = data.user.name);
  profileImgEls.forEach(el => {
      // Use custom avatar if available, otherwise fallback
      if (data.user.avatar) {
          el.src = data.user.avatar;
      } else {
          el.src = `https://ui-avatars.com/api/?name=${data.user.name.replace(" ", "+")}&background=0D8ABC&color=fff`;
      }
  });
}

function renderDashboardHome(data) {
  const shipments = data.shipments;
  
  // Calculate Stats
  const total = shipments.length;
  const inTransit = shipments.filter(s => s.status === "In Transit").length;
  const delivered = shipments.filter(s => s.status === "Delivered").length;
  const exceptions = shipments.filter(s => s.status === "Exception").length;
  
  // Update Stat Cards (Assuming specific order or adding IDs would be better, but selecting by text content is tricky, let's look for specific values to replace or add IDs in HTML later. For now, we will assume standard order: Total, Transit, Delivered, Exception)
  // To be safe, let's update HTML IDs in the next step. For now, I will use strict selectors based on the icons.
  
  const updateStat = (iconClass, value) => {
    const card = document.querySelector(`.icon-box i.${iconClass}`)?.closest(".stat-card");
    if (card) card.querySelector("h3").textContent = value;
  };

  updateStat("fa-truck-moving", total); // Total (Note: icon might differ, checking file...)
  // Actually, dashboard.html uses different icons.
  // Blue: fa-truck-moving (Total)
  // Orange: fa-clock (In Transit)
  // Green: fa-check-circle (Delivered)
  // Purple: fa-triangle-exclamation (Exceptions)
  
  updateStat("fa-truck-moving", total);
  updateStat("fa-clock", inTransit);
  updateStat("fa-check-circle", delivered);
  updateStat("fa-triangle-exclamation", exceptions);
  
  // Recent Shipments Table
  const tbody = document.querySelector("table tbody");
  if (tbody) {
    tbody.innerHTML = "";
    // Show last 5
    shipments.slice(0, 5).forEach(s => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${s.id}</td>
        <td>
           <div class="user-cell">
            <img src="https://ui-avatars.com/api/?name=${s.customer.replace(" ", "+")}&background=random" alt="" />
            ${s.customer}
           </div>
        </td>
        <td>${s.destination}</td>
        <td>${new Date(s.date).toLocaleDateString('en-IN', {  month: 'short', day: 'numeric', year: 'numeric' })}</td>
        <td><span class="status ${getStatusClass(s.status)}">${s.status}</span></td>
        <td>${formatCurrency(s.amount)}</td>
        <td><button class="action-btn"><i class="fa-solid fa-ellipsis"></i></button></td>
      `;
      tbody.appendChild(tr);
    });
  }

  // Chart setup
  const chartCanvas = document.getElementById("shipmentChart");
  if (chartCanvas) {
      // Basic chart with dynamic-ish data
      new Chart(chartCanvas.getContext("2d"), {
        type: "line",
        data: {
            labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
            datasets: [{
                label: "Shipments",
                data: [12, 19, 3, 5, 2, 3, 10], // Mock for now, hard to derive from date without more complex logic
                borderColor: "#4f46e5",
                tension: 0.4
            }]
        },
        options: { responsive: true, maintainAspectRatio: false }
      });
  }

  // Identify wallet balance on dashboard if present and update it
  const walletBalEl = document.getElementById("walletBalance");
  if(walletBalEl) walletBalEl.textContent = formatCurrency(data.wallet.balance);

  setupWalletInteractions(data);
}

// --- Shipment Page Logic (Filtering, Pagination, Export) ---
let currentState = {
    page: 1,
    itemsPerPage: 10,
    filters: {
        status: "",
        date: ""
    }
};

function renderShipmentsPage(data) {
   const tbody = document.querySelector("table tbody");
   if (!tbody) return;
   
   // Apply Filters
   let filtered = data.shipments.filter(s => {
       const statusMatch = !currentState.filters.status || s.status === currentState.filters.status;
       // Date match: simple string comparison YYYY-MM-DD
       const dateMatch = !currentState.filters.date || s.date.startsWith(currentState.filters.date);
       return statusMatch && dateMatch;
   });

   // Setup Interactions (only once)
   if(!document.getElementById("applyFiltersBtn").dataset.bound) {
       document.getElementById("applyFiltersBtn").addEventListener("click", () => {
           currentState.filters.status = document.getElementById("statusFilter").value;
           currentState.filters.date = document.getElementById("dateFilter").value;
           currentState.page = 1; // Reset to page 1
           renderShipmentsPage(data);
       });
       document.getElementById("applyFiltersBtn").dataset.bound = true;
   }

   if(!document.getElementById("exportBtn").dataset.bound) {
       document.getElementById("exportBtn").addEventListener("click", () => exportShipmentsPDF(filtered));
       document.getElementById("exportBtn").dataset.bound = true;
   }

   // Pagination
   const totalItems = filtered.length;
   const totalPages = Math.ceil(totalItems / currentState.itemsPerPage);
   const start = (currentState.page - 1) * currentState.itemsPerPage;
   const paginatedDocs = filtered.slice(start, start + currentState.itemsPerPage);

   // Render Table
   tbody.innerHTML = "";
   if(paginatedDocs.length === 0) {
       tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding: 2rem;">No shipments found.</td></tr>`;
   } else {
       paginatedDocs.forEach(s => {
          const tr = document.createElement("tr");
          tr.innerHTML = `
            <td>${s.id}</td>
            <td>
               <div class="user-cell">
                <img src="https://ui-avatars.com/api/?name=${s.customer.replace(" ", "+")}&background=random" alt="" />
                ${s.customer}
               </div>
            </td>
            <td>${s.origin}</td>
            <td>${s.destination}</td>
            <td>${new Date(s.date).toLocaleDateString('en-IN', {  month: 'short', day: 'numeric', year: 'numeric' })}</td>
            <td><span class="status ${getStatusClass(s.status)}">${s.status}</span></td>
            <td>${formatCurrency(s.amount)}</td>
            <td><button class="action-btn" onclick="alert('View Details for ${s.id}')"><i class="fa-solid fa-eye"></i></button></td>
          `;
          tbody.appendChild(tr);
       });
   }
   
   renderPagination(totalItems, totalPages, start, Math.min(start + currentState.itemsPerPage, totalItems), data);
}

function renderPagination(totalItems, totalPages, start, end, data) {
    const container = document.getElementById("paginationContainer");
    if(!container) return;
    
    container.innerHTML = `
        <span style="font-size:0.85rem; color:var(--text-secondary);">Showing ${totalItems === 0 ? 0 : start + 1}-${end} of ${totalItems} results</span>
        <div style="display:flex; gap:0.5rem;">
            <button id="prevBtn" ${currentState.page === 1 ? 'disabled' : ''} style="padding:0.5rem 1rem; border:1px solid var(--border-color); background:${currentState.page === 1 ? '#f3f4f6' : 'white'}; border-radius:0.25rem; cursor:pointer;">Previous</button>
            <button disabled style="padding:0.5rem 1rem; border:1px solid var(--primary-color); background:var(--primary-color); color:white; border-radius:0.25rem;">${currentState.page}</button>
            <button id="nextBtn" ${currentState.page >= totalPages ? 'disabled' : ''} style="padding:0.5rem 1rem; border:1px solid var(--border-color); background:${currentState.page >= totalPages ? '#f3f4f6' : 'white'}; border-radius:0.25rem; cursor:pointer;">Next</button>
        </div>
    `;
    
    document.getElementById("prevBtn").onclick = () => {
        if(currentState.page > 1) {
            currentState.page--;
            renderShipmentsPage(data);
        }
    };
    
    document.getElementById("nextBtn").onclick = () => {
        if(currentState.page < totalPages) {
            currentState.page++;
            renderShipmentsPage(data);
        }
    };
}

function exportShipmentsPDF(data) {
    // Check if libraries are loaded
    if (!window.jspdf || !window.jspdf.jsPDF) {
        alert("PDF Library not loaded. Please refresh.");
        return;
    }

    const doc = new window.jspdf.jsPDF();
    
    // Header
    doc.setFontSize(18);
    doc.setTextColor(79, 70, 229); // Primary Color
    doc.text("LogiSmart - Shipment Report", 14, 22);
    
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 30);
    
    // Table Data
    const tableColumn = ["Tracking ID", "Customer", "Origin", "Destination", "Date", "Status", "Amount"];
    const tableRows = [];

    data.forEach(s => {
        const rowData = [
            s.id,
            s.customer,
            s.origin,
            s.destination,
            new Date(s.date).toLocaleDateString(),
            s.status,
            formatCurrency(s.amount)
        ];
        tableRows.push(rowData);
    });

    // Generate Table
    doc.autoTable({
        head: [tableColumn],
        body: tableRows,
        startY: 40,
        theme: 'grid',
        headStyles: { fillColor: [79, 70, 229] }, // Primary color
        styles: { fontSize: 9 }
    });
    
    doc.save(`shipments_report_${new Date().toISOString().slice(0,10)}.pdf`);
}

function renderCustomersPage(data) {
    const grid = document.querySelector(".content-wrapper > div:nth-child(2)"); // Heuristic: Grid is the second main div
    // Better to have an ID, but let's try to find appropriate container.
    // In customers.html, the grid has style "display: grid; ..."
    const grids = document.querySelectorAll(".content-wrapper div");
    let container = null;
    grids.forEach(div => {
        if(div.style.display === "grid") container = div;
    });

    if(container) {
        container.innerHTML = "";
        data.customers.forEach(c => {
            const card = document.createElement("div");
            card.className = "stat-card";
            card.style.cssText = "flex-direction: column; gap: 0; padding:0; overflow:hidden;";
            
            // Random gradient
            const gradients = [
                "linear-gradient(135deg, #4f46e5, #818cf8)",
                "linear-gradient(135deg, #10b981, #34d399)",
                "linear-gradient(135deg, #f59e0b, #fbbf24)",
                "linear-gradient(135deg, #ec4899, #f472b6)"
            ];
            const bg = gradients[Math.floor(Math.random() * gradients.length)];

            card.innerHTML = `
                <div style="background: ${bg}; height: 80px; width: 100%;"></div>
                <div style="padding: 1.5rem; text-align: center; margin-top: -40px;">
                    <img src="https://ui-avatars.com/api/?name=${c.name.replace(" ", "+")}&background=random&size=128" style="width: 80px; height: 80px; border-radius: 50%; border: 4px solid white; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);" alt="">
                    <h3 style="margin-top: 0.5rem; font-size: 1.1rem; font-weight: 600;">${c.name}</h3>
                    <p style="color: var(--text-secondary); font-size: 0.85rem;">${c.email}</p>
                    
                    <div style="display: flex; justify-content: space-between; margin-top: 1.5rem; padding-top: 1.5rem; border-top: 1px solid var(--border-color);">
                        <div>
                            <span style="display:block; font-size: 1.1rem; font-weight: 700;">${c.orders}</span>
                            <span style="font-size: 0.75rem; color: var(--text-secondary);">Orders</span>
                        </div>
                         <div>
                            <span style="display:block; font-size: 1.1rem; font-weight: 700;">${formatCurrency(c.spent)}</span>
                            <span style="font-size: 0.75rem; color: var(--text-secondary);">Spent</span>
                        </div>
                         <div>
                            <span style="display:block; font-size: 1.1rem; font-weight: 700; color: ${c.status === 'Active' ? 'var(--success-color)' : 'var(--text-secondary)'};">${c.status}</span>
                            <span style="font-size: 0.75rem; color: var(--text-secondary);">Status</span>
                        </div>
                    </div>
                     <button style="width: 100%; margin-top: 1rem; padding: 0.5rem; border: 1px solid var(--border-color); background: transparent; border-radius: 0.5rem; cursor: pointer; color: var(--text-primary); font-weight: 500;">View Profile</button>
                </div>
            `;
            container.appendChild(card);
        });
    }
}

function renderWalletPage(data) {
    // Balance
    // Assuming H2 inside the balance card or specifically by ID if available. 
    // Previous code used querySelector('h2'). Let's stick to that but add the specific span ID if present in HTML
    const balanceEl = document.getElementById("walletBalance"); 
    if(balanceEl) balanceEl.textContent = formatCurrency(data.wallet.balance).replace("₹", ""); // Keep pure number if inside h2 with ₹ prefix, or just replace text. 
    // Actually in HTML: <h2>₹ <span id="walletBalance">0.00</span></h2>
    // So target the span preferably.
    const preciseBalanceEl = document.getElementById("walletBalance");
    if(preciseBalanceEl) preciseBalanceEl.textContent = formatCurrency(data.wallet.balance).replace("₹", "").trim();

    // Transactions
    const tbody = document.querySelector("table tbody");
    if(tbody) {
        tbody.innerHTML = "";
        data.wallet.transactions.forEach(t => {
            const tr = document.createElement("tr");
            const isCredit = t.type === "credit";
            const color = isCredit ? "var(--success-color)" : "var(--text-primary)";
            
            tr.innerHTML = `
                <td>${t.id}</td>
                <td>${new Date(t.date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}</td>
                <td>${t.desc}</td>
                <td>${t.method}</td>
                <td style="color: ${color}; font-weight: 600;">${isCredit ? '+' : ''}${formatCurrency(t.amount)}</td>
                <td><span class="status delivered">${t.status}</span></td>
            `;
            tbody.appendChild(tr);
        });
    }

    // --- Interaction Logic ---
    setupWalletInteractions(data);
}

// Shared Wallet Logic (Used in Dashboard & Wallet Page)
function setupWalletInteractions(data) {
    const addMoneyBtn = document.getElementById("addMoneyBtn");
    const withdrawBtn = document.getElementById("withdrawBtn");

    if (addMoneyBtn && !addMoneyBtn.dataset.bound) {
        addMoneyBtn.addEventListener("click", () => {
            const amountStr = prompt("Enter amount to add (₹):", "500");
            const amount = parseFloat(amountStr);
            if (!amount || amount <= 0) return alert("Invalid amount");

            // Mock Gateway Integration
            const options = {
                "key": "mock_key", // Not used but kept for structure
                "amount": amount * 100, // Paise
                "currency": "INR",
                "name": "LogiSmart Logistics",
                "description": "Wallet Recharge",
                "image": "https://ui-avatars.com/api/?name=L+S&background=0D8ABC&color=fff",
                "handler": function (response) {
                    // Success
                    data.wallet.balance += amount;
                    data.wallet.transactions.unshift({
                        id: response.razorpay_payment_id || `#PAY-${Date.now()}`,
                        date: new Date().toISOString(),
                        desc: "Wallet Recharge",
                        method: "Razorpay (Card/UPI)",
                        amount: amount,
                        type: "credit",
                        status: "Success"
                    });
                    saveData(data);
                    // alert(`Payment Successful! ₹${amount} added.`); // Alert removed for smoother flow
                    renderWalletPage(data);
                    renderGlobal(data); 
                }
            };
            openMockGateway(options);
        });
        addMoneyBtn.dataset.bound = true;
    }

    if (withdrawBtn && !withdrawBtn.dataset.bound) {
        withdrawBtn.addEventListener("click", () => {
            const amountStr = prompt("Enter amount to withdraw (₹):", "1000");
            const amount = parseFloat(amountStr);
            if (!amount || amount <= 0) return alert("Invalid amount");
            
            if (amount > data.wallet.balance) return alert("Insufficient Balance.");

            // Simulate Withdraw
            if(confirm(`Confirm withdrawal of ₹${amount} to linked bank account?`)) {
                data.wallet.balance -= amount;
                data.wallet.transactions.unshift({
                    id: `#WD-${Date.now()}`,
                    date: new Date().toISOString(),
                    desc: "Withdrawal to Bank",
                    method: "Bank Transfer",
                    amount: -amount,
                    type: "debit",
                    status: "Processed"
                });
                saveData(data);
                alert("Withdrawal request processed.");
                renderWalletPage(data);
                renderGlobal(data);
            }
        });
        withdrawBtn.dataset.bound = true;
    }
}

function renderAnalyticsPage(data) {
    const revenueEl = document.querySelector(".stat-card:first-child h3");
    if(revenueEl) {
        // Calculate total revenue from shipments
        const totalRev = data.shipments.reduce((acc, curr) => acc + curr.amount, 0);
        revenueEl.textContent = formatCurrency(totalRev);
    }
}

function renderSettingsPage(data) {
    const firstNameInput = document.getElementById("firstName");
    const lastNameInput = document.getElementById("lastName");
    const emailInput = document.getElementById("email");
    const emailNotif = document.getElementById("emailNotif");
    const smsNotif = document.getElementById("smsNotif");
    const saveIndicator = document.getElementById("saveIndicator");
    
    // 1. Populate Fields
    if(firstNameInput && lastNameInput && emailInput) {
        const [first, ...last] = data.user.name.split(" ");
        firstNameInput.value = first || "";
        lastNameInput.value = last.join(" ") || "";
        emailInput.value = data.user.email;
        
        emailNotif.checked = data.user.notifications.email;
        smsNotif.checked = data.user.notifications.sms;
    }

    // 2. Auto-Save Function
    const autoSave = () => {
        if(!firstNameInput) return;
        
        const newName = `${firstNameInput.value} ${lastNameInput.value}`.trim();
        const newEmail = emailInput.value;
        
        data.user.name = newName;
        data.user.email = newEmail;
        data.user.notifications.email = emailNotif.checked;
        data.user.notifications.sms = smsNotif.checked;
        
        saveData(data);
        
        // Show Indicator
        if(saveIndicator) {
            saveIndicator.style.opacity = "1";
            setTimeout(() => { saveIndicator.style.opacity = "0"; }, 2000);
        }
        
        // Update Global UI (Header Name, etc.)
        renderGlobal(data); 
    };

    // 3. Attach Auto-Save Listeners
    const inputs = [firstNameInput, lastNameInput, emailInput, emailNotif, smsNotif];
    inputs.forEach(input => {
        if(input) {
            input.addEventListener(input.type === "checkbox" ? "change" : "input", autoSave);
        }
    });

    // 4. Password Update Logic
    const updatePasswordBtn = document.getElementById("updatePasswordBtn");
    if(updatePasswordBtn) {
        updatePasswordBtn.onclick = () => {
            const newPass = document.getElementById("newPassword").value;
            const confirmPass = document.getElementById("confirmPassword").value;
            
            if(!newPass || !confirmPass) return alert("Please fill in both password fields.");
            if(newPass !== confirmPass) return alert("Passwords do not match.");
            if(newPass.length < 6) return alert("Password must be at least 6 characters.");
            
            data.user.password = newPass; // Saving to local mock data
            saveData(data);
            
            alert("Password updated successfully!");
            document.getElementById("newPassword").value = "";
            document.getElementById("confirmPassword").value = "";
        };
    }
    // 5. Image Upload Logic
    const avatarInput = document.getElementById("avatarInput");
    const settingsAvatar = document.getElementById("settingsAvatar");
    
    // Set initial image if exists
    if(settingsAvatar && data.user.avatar) {
        settingsAvatar.src = data.user.avatar;
    }

    if(avatarInput) {
        avatarInput.addEventListener("change", (e) => {
            const file = e.target.files[0];
            if(file) {
                const reader = new FileReader();
                reader.onload = function(event) {
                    const base64String = event.target.result;
                    
                    // Update Data
                    data.user.avatar = base64String;
                    saveData(data);
                    
                    // Update UI
                    if(settingsAvatar) settingsAvatar.src = base64String;
                    document.querySelectorAll(".profile-info img").forEach(img => img.src = base64String);
                    
                    // Show saved indicator
                    if(saveIndicator) {
                        saveIndicator.style.opacity = "1";
                        setTimeout(() => { saveIndicator.style.opacity = "0"; }, 2000);
                    }
                };
                reader.readAsDataURL(file);
            }
        });
    }
}


function setupCreateShipmentPage(data) {
    const form = document.getElementById("createShipmentForm");
    if(form) {
        form.addEventListener("submit", (e) => {
            e.preventDefault();
            const formData = new FormData(form);
            
            // Calculate final price based on selection
            const weight = parseFloat(formData.get("weight")) || 0.5;
            const service = formData.get("service");
            const price = service === "Express" ? Math.round(350 + (weight * 100)) : Math.round(150 + (weight * 50));
            
            const createShipment = () => {
                const newShipment = {
                    id: `#TRK-${Math.floor(1000 + Math.random() * 90000)}`, // Random ID
                    customer: formData.get("senderName"), 
                    origin: formData.get("senderCity"),
                    destination: formData.get("receiverCity") + ", " + formData.get("receiverPin"),
                    date: new Date().toISOString(),
                    status: "Pending",
                    amount: price
                };
                
                // Add to data
                data.shipments.unshift(newShipment);
                
                // Deduct from wallet
                data.wallet.balance -= price;
                data.wallet.transactions.unshift({
                    id: `#TXN-${Math.floor(1000 + Math.random() * 9000)}`,
                    date: new Date().toISOString(),
                    desc: `Shipment ${newShipment.id}`,
                    method: "Wallet Balance",
                    amount: -price,
                    type: "debit",
                    status: "Completed"
                });
                
                saveData(data);
                alert(`Shipment Created Successfully! Tracking ID: ${newShipment.id}`);
                window.location.href = "shipments.html";
            };

            // Check Balance
            if (data.wallet.balance >= price) {
                createShipment();
            } else {
                // Insufficient Balance - Prompt Razorpay
                if(!confirm(`Insufficient wallet balance (₹${data.wallet.balance}). Pay ₹${price} via Razorpay to proceed?`)) return;

                // Insufficient Balance - Prompt Razorpay
                // Insufficient Balance - Prompt Mock Gateway
                const options = {
                    "key": "mock_key",
                    "amount": price * 100, // Paise
                    "currency": "INR",
                    "name": "LogiSmart Logistics",
                    "description": "Shipment Payment",
                    "image": "https://ui-avatars.com/api/?name=L+S&background=0D8ABC&color=fff",
                    "handler": function (response) {
                        // Success - Credit then Debit
                        data.wallet.balance += price;
                        data.wallet.transactions.unshift({
                            id: response.razorpay_payment_id || `#PAY-${Date.now()}`,
                            date: new Date().toISOString(),
                            desc: "Auto-Recharge for Shipment",
                            method: "Razorpay",
                            amount: price,
                            type: "credit",
                            status: "Success"
                        });
                        saveData(data);
                        
                        // Proceed to create shipment (which debits again)
                        createShipment();
                    }
                };
                openMockGateway(options);
            }
        });
    }
}


function setupAddCustomerPage(data) {
    const form = document.getElementById("addCustomerForm");
    if(form) {
        form.addEventListener("submit", (e) => {
            e.preventDefault();
            const formData = new FormData(form);
            
            const newCustomer = {
                id: data.customers.length + 1,
                name: formData.get("name"),
                company: formData.get("location"), // Mapping loction to company/short desc for display
                email: formData.get("email"),
                orders: 0,
                spent: 0,
                status: formData.get("status")
            };
            
            data.customers.unshift(newCustomer);
            saveData(data);
            
            alert(`Customer ${newCustomer.name} added successfully!`);
            window.location.href = "customers.html";
        });
    }
}

function setupKYCPage(data) {
    // Mobile Display
    const mobileField = document.getElementById("registeredMobile");
    const mobileDisplay = document.querySelector(".mobile-display");
    
    if(mobileField) {
        const phone = data.user.phone || "9876543210"; 
        mobileField.value = `+91 ${phone}`;
        if(mobileDisplay) {
            mobileDisplay.innerText = `+91 ${phone}`;
            mobileDisplay.style.color = "#059669";
            mobileDisplay.style.fontWeight = "600";
        }
    }

    const form = document.getElementById("kycForm");
    if(form) {
        form.addEventListener("submit", (e) => {
            e.preventDefault();
            
            // Check declarations
            const decl1 = document.getElementById("mobileLinkDeclaration");
            const decl2 = document.getElementById("kycDeclaration");
            
            if(!decl1.checked || !decl2.checked) {
                alert("Please agree to all declarations to proceed.");
                return;
            }

            const btn = form.querySelector(".btn-submit");
            
            // Simulation UI
            btn.disabled = true;
            btn.innerHTML = `<i class="fa-solid fa-circle-notch fa-spin"></i> Verifying with Govt Database...`;
            btn.style.background = "#4f46e5";
            
            // Simulate API Delay
            setTimeout(() => {
                alert("Mobile Number Linked Successfully! KYC Verified with Government Database.");
                btn.innerHTML = `<i class="fa-solid fa-check"></i> Verified & Submitted`;
                btn.style.background = "#059669";
                
                // Keep form disabled to show completion
                Array.from(form.elements).forEach(el => el.disabled = true);
                
                // Update User Status in Data
                data.user.kycStatus = "Verified";
                saveData(data);
                
                // PDF Logic can be here if needed, but omitted for brevity/reliability
                
            }, 3000); 
        });
    }
}

function getStatusClass(status) {
    switch(status.toLowerCase()) {
        case 'delivered': return 'delivered';
        case 'in transit': return 'transit';
        case 'pending': return 'pending';
        case 'exception': return 'warning';
        default: return '';
    }
}

function setupLogout() {
    const logoutBtn = document.querySelector(".logout-section a");
    if(logoutBtn) {
        logoutBtn.addEventListener("click", (e) => {
            e.preventDefault();
            localStorage.removeItem("isLoggedIn");
            // Optional: Clear data or keep it? Real apps keep until explicit logout usually, 
            // but for this demo, let's keep data so they can log back in and see it.
            window.location.href = "index.html";
        });
    }
}

function setupSidebar() {
    const sidebar = document.querySelector(".sidebar");
    const toggleBtn = document.getElementById("sidebar-toggle");
    
    if (toggleBtn) {
      toggleBtn.addEventListener("click", () => {
        sidebar.classList.toggle("active");
      });
    }
    
    document.addEventListener("click", (e) => {
      if (window.innerWidth <= 768) {
        if (!sidebar.contains(e.target) && !toggleBtn.contains(e.target) && sidebar.classList.contains("active")) {
          sidebar.classList.remove("active");
        }
      }
    });
}

// --- Mock Payment Gateway (Custom Implementation) ---
function openMockGateway(options) {
    // 1. Inject Styles if not present
    if (!document.getElementById("mock-gateway-style")) {
        const style = document.createElement("style");
        style.id = "mock-gateway-style";
        style.textContent = `
            .mock-modal-overlay {
                position: fixed; top: 0; left: 0; width: 100%; height: 100%;
                background: rgba(0,0,0,0.6); z-index: 10000;
                display: flex; align-items: center; justify-content: center;
                font-family: 'Inter', sans-serif;
                animation: fadeIn 0.2s ease-out;
            }
            .mock-modal {
                background: white; width: 400px; border-radius: 8px;
                box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04);
                overflow: hidden; display: flex; flex-direction: column;
            }
            .mock-header {
                background: #2b3a55; color: white; padding: 1.5rem;
                display: flex; align-items: center; gap: 1rem;
            }
            .mock-header img {
                width: 50px; height: 50px; border-radius: 4px; background: white;
            }
            .mock-body { padding: 1.5rem; }
            .mock-row { display: flex; justify-content: space-between; margin-bottom: 0.75rem; font-size: 0.9rem; color: #4b5563; }
            .mock-row strong { color: #111827; }
            .mock-amount { font-size: 1.5rem; font-weight: 700; color: #111827; margin: 1rem 0; text-align: center; }
            
            .mock-payment-methods { margin-top: 1.5rem; border-top: 1px solid #e5e7eb; padding-top: 1rem; }
            .mock-method {
                display: flex; align-items: center; gap: 0.75rem; padding: 0.75rem;
                border: 1px solid #e5e7eb; border-radius: 6px; margin-bottom: 0.5rem;
                cursor: pointer; transition: all 0.2s;
            }
            .mock-method:hover, .mock-method.selected {
                border-color: #4f46e5; background: #eef2ff;
            }
            
            .mock-footer { padding: 1.5rem; background: #f9fafb; border-top: 1px solid #e5e7eb; }
            .mock-btn {
                background: #4f46e5; color: white; width: 100%; padding: 0.875rem;
                border: none; border-radius: 6px; font-weight: 600; font-size: 1rem;
                cursor: pointer; transition: background 0.2s;
            }
            .mock-btn:hover { background: #4338ca; }
            .mock-btn:disabled { background: #9ca3af; cursor: not-allowed; }
            
            .mock-close {
                position: absolute; top: 1rem; right: 1rem; color: white;
                cursor: pointer; font-size: 1.25rem; opacity: 0.7;
            }
            .mock-close:hover { opacity: 1; }
            
            @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        `;
        document.head.appendChild(style);
    }

    // 2. Create Modal DOM
    const modal = document.createElement("div");
    modal.className = "mock-modal-overlay";
    modal.innerHTML = `
        <div class="mock-modal">
            <div class="mock-header">
                <img src="${options.image || 'https://via.placeholder.com/50'}" alt="Logo">
                <div>
                    <h3 style="margin:0; font-size:1.1rem;">${options.name || 'Merchant'}</h3>
                    <p style="margin:0; font-size:0.8rem; opacity:0.8;">Trusted Payment</p>
                </div>
                <div class="mock-close">&times;</div>
            </div>
            <div class="mock-body">
                <div class="mock-row">
                    <span>Description</span>
                    <strong>${options.description || 'Transaction'}</strong>
                </div>
                <div class="mock-row">
                    <span>Transaction ID</span>
                    <strong>PY-${Math.floor(Math.random()*1000000)}</strong>
                </div>
                
                <div class="mock-amount">₹${(options.amount / 100).toFixed(2)}</div>
                
                <div class="mock-payment-methods">
                    <p style="font-size:0.85rem; color:#6b7280; margin-bottom:0.5rem;">Select Payment Method</p>
                    <div class="mock-method selected">
                        <i class="fa-solid fa-credit-card" style="color:#4f46e5;"></i>
                        <span>Card (Visa/Mastercard)</span>
                    </div>
                    <div class="mock-method">
                        <i class="fa-brands fa-google-pay" style="color:#0F9D58;"></i>
                        <span>UPI / Google Pay</span>
                    </div>
                </div>
            </div>
            <div class="mock-footer">
                <button class="mock-btn" id="mock-pay-btn">Pay ₹${(options.amount / 100).toFixed(2)}</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);

    // 3. Event Listeners
    const closeBtn = modal.querySelector(".mock-close");
    const payBtn = modal.querySelector("#mock-pay-btn");
    
    const closeModal = () => { if(modal) modal.remove(); };

    closeBtn.onclick = closeModal;
    modal.onclick = (e) => { if (e.target === modal) closeModal(); };

    payBtn.onclick = () => {
        payBtn.disabled = true;
        payBtn.innerHTML = `<i class="fa-solid fa-circle-notch fa-spin"></i> Processing...`;
        
        setTimeout(() => {
            // Success
            const response = {
                razorpay_payment_id: "pay_" + Math.random().toString(36).substr(2, 9),
                razorpay_order_id: "order_" + Math.random().toString(36).substr(2, 9),
                razorpay_signature: "sig_" + Math.random().toString(36).substr(2, 9)
            };
            
            if (options.handler) {
                options.handler(response);
            }
            
            closeModal();
        }, 2000); // 2 second delay for realism
    };
}
