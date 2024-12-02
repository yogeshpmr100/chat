 // Admin credentials
const ADMIN_CREDENTIALS = {
    username: "admin",
    email: "admin@admin.com",
    password: "Yog!@#$%!@#$%12345:"
};

// Storage Management
const storage = {
    set(key, value) {
        localStorage.setItem(key, JSON.stringify(value));
    },
    get(key) {
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : null;
    },
    remove(key) {
        localStorage.removeItem(key);
    }
};

// Global Variables
let currentUser = null;
let currentGroup = null;
let selectedFile = null;

// Initialize Application
function initializeApp() {
    // Check if user is logged in
    currentUser = storage.get("currentUser");
    if (currentUser) {
        loadChatPage();
    }

    // Set up event listeners
    setupEventListeners();
}

// Event Listeners Setup
function setupEventListeners() {
    // Auth event listeners
    document.getElementById("login-form").addEventListener("submit", handleLogin);
    document.getElementById("register-form").addEventListener("submit", handleRegister);
    document.getElementById("switch-auth").addEventListener("click", toggleAuthForms);

    // Chat page listeners
    document.getElementById("create-group").addEventListener("click", showGroupModal);
    document.getElementById("send-message").addEventListener("click", handleMessageSend);
    document.getElementById("theme-toggle").addEventListener("click", showThemeModal);
    document.getElementById("close-settings").addEventListener("click", hideThemeModal);

    // File upload
    document.getElementById("file-input").addEventListener("change", handleFileUpload);
}

// Authentication Handlers
function handleLogin(e) {
    e.preventDefault();
    const identifier = document.getElementById("login-identifier").value;
    const password = document.getElementById("login-password").value;

    // Check for admin login
    if (
        (identifier === ADMIN_CREDENTIALS.username || identifier === ADMIN_CREDENTIALS.email) &&
        password === ADMIN_CREDENTIALS.password
    ) {
        loginAsAdmin();
        return;
    }

    // Regular user login
    const users = storage.get("users") || [];
    const user = users.find(
        (u) => (u.email === identifier || u.username === identifier) && u.password === password
    );

    if (user) {
        loginUser(user);
    } else {
        alert("Invalid credentials");
    }
}

function handleRegister(e) {
    e.preventDefault();
    const username = document.getElementById("register-username").value;
    const email = document.getElementById("register-email").value;
    const password = document.getElementById("register-password").value;
    const avatar = document.querySelector('input[name="avatar"]:checked').value;

    const users = storage.get("users") || [];

    if (users.find((u) => u.email === email)) {
        alert("Email already registered");
        return;
    }

    if (users.find((u) => u.username === username)) {
        alert("Username already taken");
        return;
    }

    const newUser = {
        id: Date.now().toString(),
        username,
        email,
        password,
        avatar,
        groups: [],
        isAdmin: false
    };

    users.push(newUser);
    storage.set("users", users);
    loginUser(newUser);
}

function toggleAuthForms() {
    const loginForm = document.getElementById("login-form");
    const registerForm = document.getElementById("register-form");
    const switchAuth = document.getElementById("switch-auth");

    if (loginForm.style.display === "none") {
        loginForm.style.display = "block";
        registerForm.style.display = "none";
        switchAuth.textContent = "Register";
    } else {
        loginForm.style.display = "none";
        registerForm.style.display = "block";
        switchAuth.textContent = "Login";
    }
}

function loginUser(user) {
    currentUser = user;
    storage.set("currentUser", user);
    loadChatPage();
}

function loginAsAdmin() {
    currentUser = {
        ...ADMIN_CREDENTIALS,
        id: "admin",
        isAdmin: true,
        avatar: "admin.png"
    };
    storage.set("currentUser", currentUser);
    loadChatPage();
}

// Chat Page Handlers
function loadChatPage() {
    document.getElementById("auth-container").style.display = "none";
    document.getElementById("chat-container").style.display = "flex";
    document.getElementById("user-avatar").src = currentUser.avatar;
    document.getElementById("username").textContent = currentUser.username;
    loadGroups();
}

function loadGroups() {
    const groups = storage.get("groups") || [];
    const groupList = document.getElementById("group-list");
    groupList.innerHTML = "";

    groups.forEach((group) => {
        const li = document.createElement("li");
        li.textContent = group.name;
        li.addEventListener("click", () => joinGroup(group));
        groupList.appendChild(li);
    });
}

function showGroupModal() {
    const groups = currentUser.groups || [];
    if (!currentUser.isAdmin && groups.length >= 2) {
        alert("You can only create up to 2 groups.");
        return;
    }

    const groupName = prompt("Enter group name:");
    const groupPassword = prompt("Enter group password:");

    if (!groupName || !groupPassword) {
        alert("Group name and password are required.");
        return;
    }

    const newGroup = {
        id: Date.now().toString(),
        name: groupName,
        password: groupPassword,
        messages: [],
        members: [currentUser.id]
    };

    const allGroups = storage.get("groups") || [];
    allGroups.push(newGroup);
    storage.set("groups", allGroups);

    currentUser.groups = [...(currentUser.groups || []), newGroup.id];
    storage.set("currentUser", currentUser);

    loadGroups();
}

function joinGroup(group) {
    const password = prompt("Enter group password:");
    if (password === group.password) {
        currentGroup = group;
        document.getElementById("current-group-name").textContent = group.name;
        loadMessages(group);
    } else {
        alert("Incorrect password");
    }
}

function loadMessages(group) {
    const messagesContainer = document.getElementById("messages");
    messagesContainer.innerHTML = "";

    group.messages.forEach((message) => {
        const messageElement = createMessageElement(message);
        messagesContainer.appendChild(messageElement);
    });

    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function createMessageElement(message) {
    const div = document.createElement("div");
    div.className = `message ${message.senderId === currentUser.id ? "self" : ""}`;

    const content = document.createElement("div");
    content.className = "content";

    const header = document.createElement("div");
    header.innerHTML = `<strong>${message.senderName}</strong> <small>${new Date(
        message.timestamp
    ).toLocaleTimeString()}</small>`;

    const text = document.createElement("p");
    text.textContent = message.text;

    content.appendChild(header);
    content.appendChild(text);
    div.appendChild(content);

    return div;
}

function handleMessageSend() {
    if (!currentGroup) {
        alert("Please select a group first.");
        return;
    }

    const messageText = document.getElementById("message-text").value;
    if (!messageText.trim()) return;

    const newMessage = {
        id: Date.now().toString(),
        senderId: currentUser.id,
        senderName: currentUser.username,
        timestamp: new Date().toISOString(),
        text: messageText
    };

    const groups = storage.get("groups") || [];
    const groupIndex = groups.findIndex((g) => g.id === currentGroup.id);

    if (groupIndex !== -1) {
        groups[groupIndex].messages.push(newMessage);
        storage.set("groups", groups);
        currentGroup = groups[groupIndex];
        loadMessages(currentGroup);
    }

    document.getElementById("message-text").value = "";
}

function handleFileUpload(e) {
    const file = e.target.files[0];
    if (file) {
        alert(`File "${file.name}" selected.`);
    }
}

function showThemeModal() {
    document.getElementById("settings-modal").style.display = "flex";
}

function hideThemeModal() {
    document.getElementById("settings-modal").style.display = "none";
}

// Initialize the app
initializeApp();
