/**
 * THE SOUL VASTRA - VISITOR AUTHENTICATION & PROFILE CONTROLLER
 * Handles Login, Registration, Session Checks, Profile, Ronin Dashboard, and Logout.
 */

(function () {
  'use strict';

  // Global state
  window.SoulAuth = {
    currentUser: null,
    isInitialized: false,

    // -------------------------------------------------------------
    // Initialization
    // -------------------------------------------------------------
    init: function () {
      this.bindEvents();
      this.checkSession();
      this.checkUrlRouting();
    },

    // -------------------------------------------------------------
    // Session Verification
    // -------------------------------------------------------------
    checkSession: async function () {
      try {
        const res = await fetch('/api/auth/me', {
          method: 'GET',
          headers: { 'Accept': 'application/json' },
          credentials: 'include'
        });

        if (res.ok) {
          const data = await res.json();
          if (data.authenticated && data.user) {
            this.currentUser = data.user;
            this.renderAuthenticatedUI(data.user);
            return;
          }
        }
      } catch (err) {
        console.warn('[SoulAuth] Session check network error:', err);
      }
      this.currentUser = null;
      this.renderUnauthenticatedUI();
    },

    // -------------------------------------------------------------
    // UI Rendering (Header & Mobile Nav)
    // -------------------------------------------------------------
    renderUnauthenticatedUI: function () {
      const desktopWrap = document.getElementById('navAuthWrap');
      if (desktopWrap) {
        desktopWrap.innerHTML = `
          <button type="button" class="nav-auth-btn btn-login" onclick="SoulAuth.openModal('loginModal')">LOGIN</button>
          <button type="button" class="nav-auth-btn btn-register" onclick="SoulAuth.openModal('registerModal')">REGISTER</button>
        `;
      }

      const mobileWrap = document.getElementById('mobileAuthWrap');
      if (mobileWrap) {
        mobileWrap.innerHTML = `
          <button type="button" class="mobile-auth-btn btn-login" onclick="SoulAuth.openModal('loginModal'); window.closeMobileNav && window.closeMobileNav();">LOGIN</button>
          <button type="button" class="mobile-auth-btn btn-register" onclick="SoulAuth.openModal('registerModal'); window.closeMobileNav && window.closeMobileNav();">SIGN UP</button>
        `;
      }
    },

    renderAuthenticatedUI: function (user) {
      const initials = (user.name || user.email || 'U').trim().charAt(0).toUpperCase();
      const displayName = user.name ? user.name.split(' ')[0] : user.email.split('@')[0];
      const isOwner = user.role === 'owner';

      const desktopWrap = document.getElementById('navAuthWrap');
      if (desktopWrap) {
        desktopWrap.innerHTML = `
          <div class="nav-user-container" id="navUserContainer">
            <button type="button" class="nav-user-btn" id="navUserBtn" aria-expanded="false" aria-label="Account Menu">
              <span class="user-avatar-badge">${initials}</span>
              <span class="nav-user-name">${displayName}</span>
              <svg class="user-caret" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="6 9 12 15 18 9"></polyline>
              </svg>
            </button>
            <div class="nav-user-dropdown" id="navUserDropdown">
              <div class="user-dropdown-header">
                <div class="user-dropdown-name">${user.name || 'Ronin Member'}</div>
                <div class="user-dropdown-email">${user.email}</div>
                <span class="user-dropdown-role-badge ${isOwner ? 'owner' : ''}">
                  ${isOwner ? 'WEBSITE OWNER' : 'VIP RONIN MEMBER'}
                </span>
              </div>
              <ul class="user-dropdown-list">
                <li>
                  <button type="button" class="user-dropdown-item" onclick="SoulAuth.openAccountModal('profile')">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                    My Profile
                  </button>
                </li>
                <li>
                  <button type="button" class="user-dropdown-item" onclick="SoulAuth.openAccountModal('dashboard')">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
                    Ronin Dashboard
                  </button>
                </li>
                ${isOwner ? `
                <li>
                  <a href="/admin" class="user-dropdown-item" style="color:#ffd700;">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"></path></svg>
                    Owner Admin Panel
                  </a>
                </li>
                ` : ''}
                <li>
                  <button type="button" class="user-dropdown-item logout-btn" onclick="SoulAuth.handleLogout()">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
                    Sign Out
                  </button>
                </li>
              </ul>
            </div>
          </div>
        `;

        // Bind dropdown toggle
        const userBtn = document.getElementById('navUserBtn');
        const userDropdown = document.getElementById('navUserDropdown');
        if (userBtn && userDropdown) {
          userBtn.onclick = function (e) {
            e.stopPropagation();
            const isOpen = userDropdown.classList.toggle('show');
            userBtn.classList.toggle('active', isOpen);
            userBtn.setAttribute('aria-expanded', isOpen);
          };
        }
      }

      const mobileWrap = document.getElementById('mobileAuthWrap');
      if (mobileWrap) {
        mobileWrap.innerHTML = `
          <div class="mobile-user-card">
            <div style="display:flex;align-items:center;gap:0.75rem;margin-bottom:0.75rem;">
              <span class="user-avatar-badge" style="width:32px;height:32px;font-size:0.85rem;">${initials}</span>
              <div>
                <div style="font-weight:700;color:#fff;font-size:0.9rem;">${user.name || 'Ronin Member'}</div>
                <div style="font-size:0.75rem;color:var(--text-muted);">${user.email}</div>
              </div>
            </div>
            <div style="display:flex;gap:0.5rem;margin-top:0.5rem;">
              <button type="button" class="mobile-auth-btn btn-login" style="padding:8px;font-size:0.75rem;" onclick="SoulAuth.openAccountModal('profile'); window.closeMobileNav && window.closeMobileNav();">PROFILE</button>
              <button type="button" class="mobile-auth-btn btn-login" style="padding:8px;font-size:0.75rem;" onclick="SoulAuth.openAccountModal('dashboard'); window.closeMobileNav && window.closeMobileNav();">DASHBOARD</button>
            </div>
            ${isOwner ? `
            <a href="/admin" class="mobile-auth-btn btn-register" style="margin-top:0.5rem;display:block;text-align:center;padding:8px;font-size:0.75rem;background:#8a151b;">ADMIN PANEL</a>
            ` : ''}
            <button type="button" class="mobile-auth-btn btn-login" style="margin-top:0.5rem;color:#ff6b6b;border-color:rgba(255,107,107,0.3);padding:8px;font-size:0.75rem;" onclick="SoulAuth.handleLogout(); window.closeMobileNav && window.closeMobileNav();">SIGN OUT</button>
          </div>
        `;
      }
    },

    // -------------------------------------------------------------
    // Event Listeners Setup
    // -------------------------------------------------------------
    bindEvents: function () {
      // Close dropdowns on click outside
      document.addEventListener('click', function (e) {
        const dropdown = document.getElementById('navUserDropdown');
        const userBtn = document.getElementById('navUserBtn');
        if (dropdown && dropdown.classList.contains('show')) {
          if (!dropdown.contains(e.target) && (!userBtn || !userBtn.contains(e.target))) {
            dropdown.classList.remove('show');
            if (userBtn) {
              userBtn.classList.remove('active');
              userBtn.setAttribute('aria-expanded', 'false');
            }
          }
        }
      });

      // Escape key closes modals
      document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') {
          SoulAuth.closeModals();
        }
      });

      // Setup forms if present
      const loginForm = document.getElementById('soulLoginForm');
      if (loginForm) {
        loginForm.addEventListener('submit', (e) => this.handleLogin(e));
      }

      const registerForm = document.getElementById('soulRegisterForm');
      if (registerForm) {
        registerForm.addEventListener('submit', (e) => this.handleRegister(e));
      }

      const forgotForm = document.getElementById('soulForgotForm');
      if (forgotForm) {
        forgotForm.addEventListener('submit', (e) => this.handleForgotPassword(e));
      }

      const profileForm = document.getElementById('soulProfileForm');
      if (profileForm) {
        profileForm.addEventListener('submit', (e) => this.handleUpdateProfile(e));
      }

      // Password strength meter binding
      const regPwdInput = document.getElementById('regPassword');
      if (regPwdInput) {
        regPwdInput.addEventListener('input', () => this.updatePasswordStrength(regPwdInput.value));
      }
    },

    // -------------------------------------------------------------
    // URL Routing Helpers (/login, /register, etc.)
    // -------------------------------------------------------------
    checkUrlRouting: function () {
      const path = window.location.pathname.toLowerCase();
      const hash = window.location.hash.toLowerCase();

      if (path === '/login' || hash === '#login') {
        this.openModal('loginModal');
      } else if (path === '/register' || hash === '#register') {
        this.openModal('registerModal');
      } else if (path === '/dashboard' || hash === '#dashboard') {
        this.openAccountModal('dashboard');
      } else if (path === '/profile' || hash === '#profile') {
        this.openAccountModal('profile');
      }
    },

    // -------------------------------------------------------------
    // Modal Management
    // -------------------------------------------------------------
    openModal: function (modalId) {
      this.closeModals();
      const overlay = document.getElementById('authModalOverlay');
      const targetModal = document.getElementById(modalId);

      if (overlay && targetModal) {
        overlay.classList.add('open');
        targetModal.style.display = 'block';
        document.body.style.overflow = 'hidden';

        // Focus first input
        const firstInput = targetModal.querySelector('input');
        if (firstInput) {
          setTimeout(() => firstInput.focus(), 150);
        }
      }
    },

    closeModals: function () {
      const overlay = document.getElementById('authModalOverlay');
      if (overlay) {
        overlay.classList.remove('open');
        const modals = overlay.querySelectorAll('.auth-modal-content');
        modals.forEach((m) => (m.style.display = 'none'));
        document.body.style.overflow = '';
      }
      this.clearAlerts();
    },

    showAlert: function (modalId, message, type = 'error') {
      const modal = document.getElementById(modalId);
      if (!modal) return;
      const alert = modal.querySelector('.auth-alert');
      if (alert) {
        alert.className = `auth-alert ${type} show`;
        alert.innerHTML = `
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            ${type === 'error' ? '<circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line>' : '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline>'}
          </svg>
          <span>${message}</span>
        `;
      }
    },

    clearAlerts: function () {
      document.querySelectorAll('.auth-alert').forEach((al) => {
        al.className = 'auth-alert';
        al.innerHTML = '';
      });
    },

    togglePasswordVisibility: function (inputId, btn) {
      const input = document.getElementById(inputId);
      if (!input) return;
      if (input.type === 'password') {
        input.type = 'text';
        btn.innerHTML = `
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
            <line x1="1" y1="1" x2="23" y2="23"></line>
          </svg>
        `;
        btn.setAttribute('aria-label', 'Hide Password');
      } else {
        input.type = 'password';
        btn.innerHTML = `
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
            <circle cx="12" cy="12" r="3"></circle>
          </svg>
        `;
        btn.setAttribute('aria-label', 'Show Password');
      }
    },

    // -------------------------------------------------------------
    // Password Strength Meter
    // -------------------------------------------------------------
    updatePasswordStrength: function (password) {
      const container = document.getElementById('regPwdStrength');
      const label = document.getElementById('regStrengthLabel');
      if (!container || !label) return;

      if (!password) {
        container.className = 'pwd-strength-container';
        label.textContent = 'None';
        return;
      }

      let score = 0;
      if (password.length >= 8) score++;
      if (password.match(/[a-z]/) && password.match(/[A-Z]/)) score++;
      if (password.match(/\d/)) score++;
      if (password.match(/[^a-zA-Z0-9]/) || password.length >= 12) score++;

      container.className = 'pwd-strength-container';
      if (score === 1) {
        container.classList.add('pwd-weak');
        label.textContent = 'Weak (Needs numbers/mix)';
      } else if (score === 2) {
        container.classList.add('pwd-fair');
        label.textContent = 'Fair (Add special characters)';
      } else if (score === 3) {
        container.classList.add('pwd-good');
        label.textContent = 'Strong';
      } else if (score >= 4) {
        container.classList.add('pwd-samurai');
        label.textContent = 'Samurai Grade (Forged)';
      }
    },

    // -------------------------------------------------------------
    // Authentication Handlers
    // -------------------------------------------------------------
    handleLogin: async function (e) {
      e.preventDefault();
      this.clearAlerts();

      const email = (document.getElementById('loginEmail').value || '').trim();
      const password = document.getElementById('loginPassword').value;
      const remember = document.getElementById('loginRemember').checked;
      const submitBtn = document.getElementById('loginSubmitBtn');

      if (!email || !password) {
        this.showAlert('loginModal', 'Please enter your email and password.', 'error');
        return;
      }

      submitBtn.classList.add('loading');
      submitBtn.disabled = true;

      try {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          credentials: 'include',
          body: JSON.stringify({
            email: email,
            password: password,
            remember_me: remember
          })
        });

        const data = await res.json();

        if (res.ok && data.success) {
          this.currentUser = data.user;
          this.renderAuthenticatedUI(data.user);
          this.closeModals();
          this.showToast(`Welcome back, ${data.user.name || 'Ronin'}!`);

          // If owner logged in from public page, optional notice
          if (data.user.role === 'owner') {
            console.log('[SoulAuth] Owner authenticated.');
          }
        } else {
          this.showAlert('loginModal', data.error || 'Invalid credentials. Please try again.', 'error');
        }
      } catch (err) {
        this.showAlert('loginModal', 'Network error. Please check your connection and try again.', 'error');
      } finally {
        submitBtn.classList.remove('loading');
        submitBtn.disabled = false;
      }
    },

    handleRegister: async function (e) {
      e.preventDefault();
      this.clearAlerts();

      const name = (document.getElementById('regName').value || '').trim();
      const email = (document.getElementById('regEmail').value || '').trim();
      const password = document.getElementById('regPassword').value;
      const confirmPassword = document.getElementById('regConfirmPassword').value;
      const terms = document.getElementById('regTerms').checked;
      const submitBtn = document.getElementById('regSubmitBtn');

      // Validation
      if (!name || name.length < 2) {
        this.showAlert('registerModal', 'Please provide your full name (at least 2 characters).', 'error');
        return;
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!email || !emailRegex.test(email)) {
        this.showAlert('registerModal', 'Please enter a valid email address.', 'error');
        return;
      }

      if (!password || password.length < 8) {
        this.showAlert('registerModal', 'Password must be at least 8 characters long.', 'error');
        return;
      }

      if (password !== confirmPassword) {
        this.showAlert('registerModal', 'Passwords do not match. Please re-enter.', 'error');
        return;
      }

      if (!terms) {
        this.showAlert('registerModal', 'You must agree to the Terms & Conditions to proceed.', 'error');
        return;
      }

      submitBtn.classList.add('loading');
      submitBtn.disabled = true;

      try {
        const res = await fetch('/api/auth/register', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          credentials: 'include',
          body: JSON.stringify({
            name: name,
            email: email,
            password: password,
            confirm_password: confirmPassword,
            terms: terms
          })
        });

        const data = await res.json();

        if (res.ok && data.success) {
          this.currentUser = data.user;
          this.renderAuthenticatedUI(data.user);
          this.closeModals();
          this.showToast('Account created successfully! Welcome to THE SOUL VASTRA.');
        } else if (res.status === 409) {
          this.showAlert('registerModal', `${data.error || 'Account already exists.'} <a href="javascript:void(0)" onclick="SoulAuth.openModal('loginModal')" style="color:#fff;text-decoration:underline;margin-left:4px;">Log in here</a>`, 'error');
        } else {
          this.showAlert('registerModal', data.error || 'Registration failed. Please try again.', 'error');
        }
      } catch (err) {
        this.showAlert('registerModal', 'Network error. Please verify your connection.', 'error');
      } finally {
        submitBtn.classList.remove('loading');
        submitBtn.disabled = false;
      }
    },

    handleForgotPassword: async function (e) {
      e.preventDefault();
      const email = (document.getElementById('forgotEmail').value || '').trim();
      const submitBtn = document.getElementById('forgotSubmitBtn');

      if (!email) {
        this.showAlert('forgotPasswordModal', 'Please enter your registered email address.', 'error');
        return;
      }

      submitBtn.classList.add('loading');
      submitBtn.disabled = true;

      try {
        const res = await fetch('/api/auth/forgot-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: email })
        });
        const data = await res.json();
        this.showAlert('forgotPasswordModal', data.message || 'If this email is registered, password reset instructions have been dispatched.', 'success');
      } catch (err) {
        this.showAlert('forgotPasswordModal', 'Request failed. Please try again later.', 'error');
      } finally {
        submitBtn.classList.remove('loading');
        submitBtn.disabled = false;
      }
    },

    handleLogout: async function () {
      try {
        await fetch('/api/auth/logout', {
          method: 'POST',
          credentials: 'include'
        });
      } catch (err) {
        console.warn('[SoulAuth] Logout fetch error:', err);
      }
      this.currentUser = null;
      this.renderUnauthenticatedUI();
      this.closeModals();
      this.showToast('You have been signed out. Walk in honor.');
    },

    // -------------------------------------------------------------
    // Account Modal & Profile Updates
    // -------------------------------------------------------------
    openAccountModal: async function (initialTab = 'profile') {
      if (!this.currentUser) {
        this.openModal('loginModal');
        this.showAlert('loginModal', 'Please log in to access your Ronin Account.', 'info');
        return;
      }

      this.openModal('accountModal');
      this.switchAccountTab(initialTab);

      // Populate Profile Form fields
      const nameInput = document.getElementById('profileName');
      const emailInput = document.getElementById('profileEmail');
      const memberSince = document.getElementById('profileCreatedDate');

      if (nameInput) nameInput.value = this.currentUser.name || '';
      if (emailInput) emailInput.value = this.currentUser.email || '';
      if (memberSince) {
        const dateStr = this.currentUser.created_at ? new Date(this.currentUser.created_at).toLocaleDateString() : 'Active Ronin';
        memberSince.textContent = dateStr;
      }

      // Fetch fresh Dashboard details
      try {
        const res = await fetch('/api/user/dashboard', { credentials: 'include' });
        if (res.ok) {
          const d = await res.json();
          this.renderDashboardDetails(d.dashboard);
        }
      } catch (e) {
        console.warn('[SoulAuth] Dashboard load error:', e);
      }
    },

    switchAccountTab: function (tabName) {
      document.querySelectorAll('.account-tab-btn').forEach((btn) => {
        btn.classList.toggle('active', btn.dataset.tab === tabName);
      });
      document.querySelectorAll('.account-tab-pane').forEach((pane) => {
        pane.classList.toggle('active', pane.id === `tab-${tabName}`);
      });
    },

    renderDashboardDetails: function (dash) {
      if (!dash) return;
      const tierBadge = document.getElementById('dashTierBadge');
      const tierTitle = document.getElementById('dashTierTitle');
      const ordersList = document.getElementById('dashOrdersList');

      if (tierBadge) tierBadge.textContent = dash.tier_badge || 'DISCIPLINE TIER I';
      if (tierTitle) tierTitle.textContent = dash.membership_tier || 'VIP Ronin Member';

      if (ordersList) {
        if (!dash.orders || dash.orders.length === 0) {
          ordersList.innerHTML = `
            <div style="text-align:center;padding:1.5rem;color:var(--text-muted);font-size:0.85rem;">
              No orders placed yet. Explore the collection to forge your style.
            </div>
          `;
        } else {
          ordersList.innerHTML = dash.orders.map((ord) => `
            <div class="account-order-item">
              <div>
                <div class="order-meta-title">${ord.id} &bull; <span class="order-badge-status">${ord.status}</span></div>
                <div class="order-meta-sub">${ord.items.join(', ')} &bull; ${ord.date}</div>
              </div>
              <div class="order-total-val">${ord.total}</div>
            </div>
          `).join('');
        }
      }
    },

    handleUpdateProfile: async function (e) {
      e.preventDefault();
      this.clearAlerts();
      const newName = (document.getElementById('profileName').value || '').trim();
      const submitBtn = document.getElementById('profileSubmitBtn');

      if (!newName || newName.length < 2) {
        this.showAlert('accountModal', 'Full name must have at least 2 characters.', 'error');
        return;
      }

      submitBtn.classList.add('loading');
      submitBtn.disabled = true;

      try {
        const res = await fetch('/api/user/profile', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ name: newName })
        });
        const data = await res.json();
        if (res.ok && data.success) {
          this.currentUser.name = newName;
          this.renderAuthenticatedUI(this.currentUser);
          this.showAlert('accountModal', 'Profile updated successfully!', 'success');
          this.showToast('Profile updated successfully.');
        } else {
          this.showAlert('accountModal', data.error || 'Failed to update profile.', 'error');
        }
      } catch (err) {
        this.showAlert('accountModal', 'Connection error. Please try again.', 'error');
      } finally {
        submitBtn.classList.remove('loading');
        submitBtn.disabled = false;
      }
    },

    // -------------------------------------------------------------
    // Global Toast Notification Helper
    // -------------------------------------------------------------
    showToast: function (message) {
      if (window.soulCart && typeof window.soulCart.showToast === 'function') {
        window.soulCart.showToast(message);
        return;
      }
      const toast = document.getElementById('soulToast');
      if (toast) {
        toast.textContent = message;
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 3500);
      }
    }
  };

  // Initialize on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => window.SoulAuth.init());
  } else {
    window.SoulAuth.init();
  }
})();
