let currentUser = null
let pantryItems = []
let allRecipes = []
let userRecipes = []
let savedRecipes = []
let allUsers = []

const API_BASE = 'http://localhost:3000/api'

async function loadUsersFromCSV()
{
    try
    {
        const response = await fetch(`${API_BASE}/users`)
        if (!response.ok) {
            console.error('Failed to fetch users:', response.status);
            return false;
        }
        
        const csvText = await response.text();
        console.log('Users CSV received:', csvText.substring(0, 200)); // Debug
        
        allUsers = parseCSV(csvText);
        
        // Parse pantry items for each user
        allUsers.forEach(user => {
            user.pantryItems = [];
            
            if (user.pantry && user.pantry.trim() !== '') {
                const items = user.pantry.split('|');
                
                items.forEach((item, index) => {
                    const parts = item.split(':');
                    if (parts.length >= 2) {
                        user.pantryItems.push({
                            id: index + 1,
                            name: parts[0].trim(),
                            amount: parts[1].trim()
                        });
                    }
                });
            }
        });
        
        console.log('Loaded users:', allUsers.length); // Debug
        return true;
    }
    catch (error)
    {
        console.error('Error loading users:', error);
        allUsers = [];
        return false;
    }
}

async function loadRecipesFromCSV()
{
    try
    {
        const response = await fetch(`${API_BASE}/recipes`);
        if (!response.ok) {
            console.error('Failed to fetch recipes:', response.status);
            return false;
        }
        
        const csvText = await response.text();
        console.log('Recipes CSV received:', csvText.substring(0, 200)); // Debug
        
        const recipesData = parseCSV(csvText);
        console.log('Parsed recipes data:', recipesData.length); // Debug
        
        allRecipes = recipesData.map(recipe =>
        {
            // Handle ingredients
            let ingredientsStr = recipe.ingredients || '';
            if (ingredientsStr.startsWith('"') && ingredientsStr.endsWith('"')) {
                ingredientsStr = ingredientsStr.slice(1, -1);
            }
            
            const ingredients = ingredientsStr 
                ? ingredientsStr.split(',').map(ing => ing.trim())
                : [];
            
            // Handle instructions
            let instructionsStr = recipe.instructions || '';
            if (instructionsStr.startsWith('"') && instructionsStr.endsWith('"')) {
                instructionsStr = instructionsStr.slice(1, -1);
            }
            
            const instructions = instructionsStr 
                ? instructionsStr.split('|').map(step => step.trim())
                : [];
            
            return {
                id: parseInt(recipe.id) || 0,
                title: recipe.title || 'Untitled Recipe',
                ingredients: ingredients,
                instructions: instructions,
                author: recipe.author || 'Unknown',
                likes: parseInt(recipe.likes) || 0,
                isUserRecipe: recipe.isUserRecipe === 'true',
                matchPercentage: parseInt(recipe.matchPercentage) || 0,
                prepTime: recipe.prepTime || 'Not specified',
                cookTime: recipe.cookTime || 'Not specified',
                likedBy: [] // Initialize likedBy array
            };
        });
        
        console.log('Processed recipes:', allRecipes.length); // Debug
        return true;
    }
    catch (error)
    {
        console.error('Error loading recipes:', error);
        allRecipes = [];
        return false;
    }
}

async function loadRecipesFromCSV()
{
    try
    {
        const response = await fetch(`${API_BASE}/recipes`)
        if (!response.ok) return false
        
        const recipesData = await response.json()
        
        allRecipes = recipesData.map(recipe =>
        {
            // Handle ingredients
            let ingredientsStr = recipe.ingredients || ''
            if (ingredientsStr.startsWith('"') && ingredientsStr.endsWith('"')) {
                ingredientsStr = ingredientsStr.slice(1, -1)
            }
            
            const ingredients = ingredientsStr 
                ? ingredientsStr.split(',').map(ing => ing.trim())
                : []
            
            // Handle instructions
            let instructionsStr = recipe.instructions || ''
            if (instructionsStr.startsWith('"') && instructionsStr.endsWith('"')) {
                instructionsStr = instructionsStr.slice(1, -1)
            }
            
            const instructions = instructionsStr 
                ? instructionsStr.split('|').map(step => step.trim())
                : []
            
            return {
                id: parseInt(recipe.id) || 0,
                title: recipe.title || 'Untitled Recipe',
                ingredients: ingredients,
                instructions: instructions,
                author: recipe.author || 'Unknown',
                likes: parseInt(recipe.likes) || 0,
                isUserRecipe: recipe.isUserRecipe === 'true',
                matchPercentage: parseInt(recipe.matchPercentage) || 0,
                prepTime: recipe.prepTime || 'Not specified',
                cookTime: recipe.cookTime || 'Not specified',
                likedBy: [] // Initialize likedBy array
            }
        })
        
        return true
    }
    catch (error)
    {
        console.error('Error loading recipes:', error)
        allRecipes = []
        return false
    }
}

async function saveUserData()
{
    if (!currentUser) {
        console.error('No current user to save data for');
        return false;
    }
    
    try
    {
        const user = allUsers.find(u => u.id === currentUser.id);
        if (user)
        {
            user.pantryItems = pantryItems;
            
            const pantryString = pantryItems.map(item => 
                `${item.name}:${item.amount}`
            ).join('|');
            
            user.pantry = pantryString;
            
            console.log('Saving pantry for user', currentUser.id, ':', pantryString); // Debug
            
            // Update on server
            const response = await fetch(`${API_BASE}/users/${currentUser.id}/pantry`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ pantry: pantryString })
            });
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error('Server error saving pantry:', response.status, errorText);
                throw new Error(`Server error: ${response.status}`);
            }
            
            const result = await response.json();
            console.log('Pantry save result:', result); // Debug
        }
        
        localStorage.setItem('potluck_user', JSON.stringify(currentUser));
        localStorage.setItem(`potluck_pantry_${currentUser.id}`, JSON.stringify(pantryItems));
        
        console.log('Pantry saved successfully'); // Debug
        return true;
    }
    catch (error)
    {
        console.error('Error saving user data:', error);
        showMessage('Failed to save pantry data', 'error');
        return false;
    }
}

function parseCSV(csvText) {
    console.log('Parsing CSV, length:', csvText.length);
    
    const lines = csvText.split('\n').filter(line => line.trim() !== '');
    
    if (lines.length === 0) {
        console.error('CSV is empty!');
        return [];
    }
    
    const headers = lines[0].split(',').map(h => h.trim());
    console.log('CSV headers:', headers);
    
    const data = [];
    
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line === '') continue;
        
        console.log(`Parsing line ${i}:`, line.substring(0, 100));
        
        const values = [];
        let currentValue = '';
        let inQuotes = false;
        
        for (let char of line) {
            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                values.push(currentValue.trim());
                currentValue = '';
            } else {
                currentValue += char;
            }
        }
        values.push(currentValue.trim());
        
        // Remove surrounding quotes from values
        const cleanedValues = values.map(val => {
            if (val.startsWith('"') && val.endsWith('"')) {
                return val.slice(1, -1);
            }
            return val;
        });
        
        const row = {};
        for (let j = 0; j < headers.length; j++) {
            row[headers[j]] = j < cleanedValues.length ? cleanedValues[j] : '';
        }
        
        console.log(`Row ${i} parsed:`, { id: row.id, title: row.title || row.name });
        data.push(row);
    }
    
    console.log('Total rows parsed:', data.length);
    return data;
}

async function loadUsersFromCSV() {
    try {
        console.log('=== LOADING USERS ===');
        const response = await fetch(`${API_BASE}/users`);
        
        if (!response.ok) {
            console.error('API request failed:', response.status, response.statusText);
            return false;
        }
        
        const csvText = await response.text();
        console.log('Raw users CSV length:', csvText.length);
        
        allUsers = parseCSV(csvText);
        console.log('Parsed users count:', allUsers.length);
        
        // Parse pantry items
        allUsers.forEach(user => {
            user.pantryItems = [];
            if (user.pantry && user.pantry.trim() !== '') {
                const items = user.pantry.split('|');
                items.forEach((item, index) => {
                    const parts = item.split(':');
                    if (parts.length >= 2) {
                        user.pantryItems.push({
                            id: index + 1,
                            name: parts[0].trim(),
                            amount: parts[1].trim()
                        });
                    }
                });
            }
        });
        
        console.log('=== USERS LOADED ===');
        return true;
    } catch (error) {
        console.error('Error loading users:', error);
        return false;
    }
}

async function loadRecipesFromCSV() {
    try {
        console.log('=== LOADING RECIPES ===');
        const response = await fetch(`${API_BASE}/recipes`);
        
        if (!response.ok) {
            console.error('API request failed:', response.status, response.statusText);
            return false;
        }
        
        const csvText = await response.text();
        console.log('Raw CSV received, length:', csvText.length);
        
        if (!csvText || csvText.trim().length === 0) {
            console.error('Empty CSV received from server!');
            return false;
        }
        
        // Parse CSV
        const recipesData = parseCSV(csvText);
        console.log('Parsed recipes data count:', recipesData.length);
        
        if (recipesData.length === 0) {
            console.error('No recipes parsed!');
            console.log('CSV sample:', csvText.substring(0, 500));
            return false;
        }
        
        // Transform to recipe objects
        allRecipes = recipesData.map((recipe, index) => {
            // Debug each recipe
            console.log(`Recipe ${index}:`, {
                id: recipe.id,
                title: recipe.title,
                ingredients: recipe.ingredients ? recipe.ingredients.substring(0, 50) + '...' : 'none',
                author: recipe.author
            });
            
            // Parse ingredients
            let ingredients = [];
            if (recipe.ingredients) {
                let ingredientsStr = recipe.ingredients;
                // Remove quotes if present
                if (ingredientsStr.startsWith('"') && ingredientsStr.endsWith('"')) {
                    ingredientsStr = ingredientsStr.slice(1, -1);
                }
                // Split by comma
                ingredients = ingredientsStr.split(',').map(ing => ing.trim()).filter(ing => ing);
            }
            
            // Parse instructions
            let instructions = [];
            if (recipe.instructions) {
                let instructionsStr = recipe.instructions;
                if (instructionsStr.startsWith('"') && instructionsStr.endsWith('"')) {
                    instructionsStr = instructionsStr.slice(1, -1);
                }
                instructions = instructionsStr.split('|').map(step => step.trim()).filter(step => step);
            }
            
            return {
                id: parseInt(recipe.id) || index + 1,
                title: recipe.title || `Recipe ${index + 1}`,
                ingredients: ingredients,
                instructions: instructions,
                author: recipe.author || 'Unknown',
                likes: parseInt(recipe.likes) || 0,
                isUserRecipe: recipe.isUserRecipe === 'true',
                matchPercentage: parseInt(recipe.matchPercentage) || 0,
                prepTime: recipe.prepTime || '10 min',
                cookTime: recipe.cookTime || '20 min',
                likedBy: []
            };
        });
        
        console.log('=== RECIPES LOADED ===');
        console.log('Total recipes:', allRecipes.length);
        console.log('First recipe:', allRecipes[0]);
        
        return true;
    } catch (error) {
        console.error('Error loading recipes:', error);
        console.error('Error stack:', error.stack);
        return false;
    }
}

async function saveUserData()
{
    if (!currentUser) {
        console.error('No current user to save data for');
        return false;
    }
    
    try
    {
        const user = allUsers.find(u => u.id === currentUser.id);
        if (user)
        {
            user.pantryItems = pantryItems;
            
            const pantryString = pantryItems.map(item => 
                `${item.name}:${item.amount}`
            ).join('|');
            
            user.pantry = pantryString;
            
            console.log('Saving pantry for user', currentUser.id, ':', pantryString);
            
            // Save to server (CSV file)
            const response = await fetch(`${API_BASE}/users/${currentUser.id}/pantry`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ pantry: pantryString })
            });
            
            if (!response.ok) {
                console.error('Server error saving pantry:', response.status);
                // Don't throw - we still want to save to localStorage
            } else {
                console.log('Pantry saved to server successfully');
            }
        }
        
        // ALWAYS save to localStorage (this is what keeps it between sessions)
        localStorage.setItem(`potluck_pantry_${currentUser.id}`, JSON.stringify(pantryItems));
        localStorage.setItem('potluck_user', JSON.stringify(currentUser));
        
        console.log('Pantry saved to localStorage successfully');
        return true;
    }
    catch (error)
    {
        console.error('Error saving user data:', error);
        // Try to at least save to localStorage
        try {
            localStorage.setItem(`potluck_pantry_${currentUser.id}`, JSON.stringify(pantryItems));
            console.log('Saved to localStorage as fallback');
        } catch (e) {
            console.error('Failed to save to localStorage:', e);
        }
        return false;
    }
}

function showMessage(message, type = 'info')
{
    const messageDiv = document.getElementById('messageDisplay')
    if (!messageDiv)
    {
        const newDiv = document.createElement('div')
        newDiv.id = 'messageDisplay'
        newDiv.style.cssText = `
            position: fixed;
            top: 80px;
            left: 50%;
            transform: translateX(-50%);
            padding: 12px 24px;
            border-radius: 8px;
            z-index: 9999;
            font-weight: 500;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            transition: opacity 0.3s;
        `
        document.body.appendChild(newDiv)
    }
    
    const display = document.getElementById('messageDisplay')
    display.textContent = message
    
    if (type === 'error')
    {
        display.style.backgroundColor = '#fee'
        display.style.color = '#c00'
        display.style.border = '1px solid #fcc'
    }
    else if (type === 'success')
    {
        display.style.backgroundColor = '#dfd'
        display.style.color = '#080'
        display.style.border = '1px solid #afa'
    }
    else
    {
        display.style.backgroundColor = '#e8f4fc'
        display.style.color = '#2c3e50'
        display.style.border = '1px solid #3498db'
    }
    
    display.style.opacity = '1'
    display.style.display = 'block'
    
    setTimeout(() => {
        display.style.opacity = '0'
        setTimeout(() => {
            display.style.display = 'none'
        }, 300)
    }, 3000)
}

const sections = {
    home: document.getElementById('home-section'),
    recipes: document.getElementById('recipes-section'),
    pantry: document.getElementById('pantry-section'),
    cookbook: document.getElementById('cookbook-section'),
    community: document.getElementById('community-section')
}

const authForms = {
    login: document.getElementById('loginForm'),
    register: document.getElementById('registerForm')
}

const loginBtn = document.getElementById('loginBtn')
const registerBtn = document.getElementById('registerBtn')
const logoutBtn = document.getElementById('logoutBtn')
const recipeDetail = document.getElementById('recipeDetail')

function showSection(sectionId)
{
    console.log('showSection called:', sectionId);
    
    Object.values(sections).forEach(section =>
    {
        if (section) section.style.display = 'none'
    })
    
    authForms.login.classList.remove('active')
    authForms.register.classList.remove('active')
    
    if (sections[sectionId])
    {
        sections[sectionId].style.display = 'block'
        
        updateSectionVisibility()
        
        if (sectionId === 'recipes')
        {
            console.log('Rendering recipes section');
            renderRecipes()
        }
        else if (sectionId === 'pantry')
        {
            renderPantryItems()
        }
        else if (sectionId === 'cookbook')
        {
            renderCookbook()
        }
        else if (sectionId === 'community')
        {
            renderCommunityRecipes()
        }
    }
}

function updateSectionVisibility()
{
    const isLoggedIn = !!currentUser
    
    if (sections.recipes && sections.recipes.style.display === 'block')
    {
        const loginPrompt = document.getElementById('recipesLoginPrompt')
        if (loginPrompt)
        {
            loginPrompt.style.display = isLoggedIn ? 'none' : 'block'
        }
    }
    
    if (sections.pantry && sections.pantry.style.display === 'block')
    {
        const loginPrompt = document.getElementById('pantryLoginPrompt')
        const pantryContent = document.getElementById('pantryContent')
        if (loginPrompt && pantryContent)
        {
            if (isLoggedIn)
            {
                loginPrompt.style.display = 'none'
                pantryContent.style.display = 'block'
            }
            else
            {
                loginPrompt.style.display = 'block'
                pantryContent.style.display = 'none'
            }
        }
    }
    
    if (sections.cookbook && sections.cookbook.style.display === 'block')
    {
        const loginPrompt = document.getElementById('cookbookLoginPrompt')
        const cookbookContent = document.getElementById('cookbookContent')
        if (loginPrompt && cookbookContent)
        {
            if (isLoggedIn)
            {
                loginPrompt.style.display = 'none'
                cookbookContent.style.display = 'block'
            }
            else
            {
                loginPrompt.style.display = 'block'
                cookbookContent.style.display = 'none'
            }
        }
    }
    
    if (sections.community && sections.community.style.display === 'block')
    {
        const loginPrompt = document.getElementById('communityLoginPrompt')
        const communityContent = document.getElementById('communityContent')
        if (loginPrompt && communityContent)
        {
            if (isLoggedIn)
            {
                loginPrompt.style.display = 'none'
                communityContent.style.display = 'block'
            }
            else
            {
                loginPrompt.style.display = 'block'
                communityContent.style.display = 'none'
            }
        }
    }
}

function showAuthForm(type)
{
    Object.values(sections).forEach(section =>
    {
        if (section) section.style.display = 'none'
    })
    
    authForms.login.classList.remove('active')
    authForms.register.classList.remove('active')
    
    if (type === 'login')
    {
        authForms.login.classList.add('active')
    }
    else
    {
        authForms.register.classList.add('active')
    }
    
    const loginError = document.getElementById('loginError')
    if (loginError)
    {
        loginError.style.display = 'none'
    }
}

function handlePantryClick()
{
    if (!currentUser)
    {
        showAuthForm('login')
        showMessage('Please login to access pantry features', 'error')
        return
    }
    
    showSection('pantry')
}

function handleCookbookClick()
{
    if (!currentUser)
    {
        showAuthForm('login')
        showMessage('Please login to access your cookbook', 'error')
        return
    }
    
    showSection('cookbook')
}

function handleCommunityClick()
{
    if (!currentUser)
    {
        showAuthForm('login')
        showMessage('Please login to access community features', 'error')
        return
    }
    
    showSection('community')
}

function updateAuthUI()
{
    const heroContent = document.querySelector('.hero-content')
    
    if (currentUser)
    {
        loginBtn.style.display = 'none'
        registerBtn.style.display = 'none'
        logoutBtn.style.display = 'inline-block'
        
        // Add logged-in class to hide buttons and text
        if (heroContent)
        {
            heroContent.classList.add('logged-in')
        }
    }
    else
    {
        loginBtn.style.display = 'inline-block'
        registerBtn.style.display = 'inline-block'
        logoutBtn.style.display = 'none'
        
        // Remove logged-in class to show buttons and text
        if (heroContent)
        {
            heroContent.classList.remove('logged-in')
        }
    }
}

async function login()
{
    const email = document.getElementById('loginEmail').value
    const password = document.getElementById('loginPassword').value
    
    if (!email || !password)
    {
        showMessage('Please enter both email and password', 'error')
        return
    }
    
    // Find user
    const user = allUsers.find(u => u.email === email && u.password === password)
    
    if (!user)
    {
        const errorDiv = document.getElementById('loginError')
        if (errorDiv)
        {
            errorDiv.style.display = 'block'
        }
        showMessage('Invalid email or password', 'error')
        return
    }
    
    currentUser = {
        id: user.id,
        name: user.name,
        email: user.email
    }
    
    // ALWAYS check localStorage FIRST for saved pantry
    const savedPantry = localStorage.getItem(`potluck_pantry_${user.id}`)
    console.log('Checking localStorage for pantry, user ID:', user.id);
    console.log('Saved pantry in localStorage:', savedPantry);
    
    if (savedPantry)
    {
        try
        {
            pantryItems = JSON.parse(savedPantry)
            console.log('Loaded pantry from localStorage:', pantryItems);
            
            // IMPORTANT: Also update the user object in allUsers with localStorage data
            // so it gets saved back to CSV
            user.pantryItems = [...pantryItems];
            user.pantry = pantryItems.map(item => 
                `${item.name}:${item.amount}`
            ).join('|');
            
            // Save updated user data back to server
            await fetch(`${API_BASE}/users/${user.id}/pantry`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ pantry: user.pantry })
            });
            
        }
        catch (e)
        {
            console.error('Error parsing saved pantry, using CSV data:', e)
            pantryItems = user.pantryItems ? [...user.pantryItems] : []
        }
    }
    else
    {
        // No saved data in localStorage, use CSV data
        pantryItems = user.pantryItems ? [...user.pantryItems] : []
        console.log('No localStorage data, using CSV pantry:', pantryItems);
        
        // Save CSV data to localStorage for next time
        localStorage.setItem(`potluck_pantry_${user.id}`, JSON.stringify(pantryItems))
    }
    
    // Save user to localStorage
    localStorage.setItem('potluck_user', JSON.stringify(currentUser))
    
    updateAuthUI()
    
    authForms.login.classList.remove('active')
    authForms.register.classList.remove('active')
    
    const errorDiv = document.getElementById('loginError')
    if (errorDiv)
    {
        errorDiv.style.display = 'none'
    }
    
    document.getElementById('loginEmail').value = ''
    document.getElementById('loginPassword').value = ''
    
    showMessage(`Welcome back, ${currentUser.name}!`, 'success')
    
    showSection('home')
}

async function register()
{
    const name = document.getElementById('registerName').value
    const email = document.getElementById('registerEmail').value
    const password = document.getElementById('registerPassword').value
    
    if (!name || !email || !password)
    {
        showMessage('Please fill all fields', 'error')
        return
    }
    
    // Check if user already exists
    if (allUsers.find(u => u.email === email))
    {
        showMessage('An account with this email already exists', 'error')
        return
    }
    
    const newUser = {
        name: name,
        email: email,
        password: password
    }
    
    try {
        // Send to backend API
        const response = await fetch(`${API_BASE}/users`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(newUser)
        })
        
        if (!response.ok) {
            const errorData = await response.json()
            throw new Error(errorData.error || 'Failed to register user')
        }
        
        const result = await response.json()
        
        // Update local allUsers array
        const registeredUser = result.user
        allUsers.push(registeredUser)
        
        currentUser = {
            id: registeredUser.id,
            name: registeredUser.name,
            email: registeredUser.email
        }
        
        pantryItems = []
        
        localStorage.setItem('potluck_user', JSON.stringify(currentUser))
        localStorage.setItem(`potluck_pantry_${currentUser.id}`, JSON.stringify(pantryItems))
        
        updateAuthUI()
        
        authForms.login.classList.remove('active')
        authForms.register.classList.remove('active')
        
        document.getElementById('registerName').value = ''
        document.getElementById('registerEmail').value = ''
        document.getElementById('registerPassword').value = ''
        
        showMessage(`Welcome to Potluck, ${name}! Your account has been created.`, 'success')
        
        showSection('home')
    } catch (error) {
        console.error('Registration error:', error)
        showMessage(`Failed to create account: ${error.message}`, 'error')
    }
}

function logout()
{
    // Save pantry data BEFORE logging out
    saveUserData().then(() => {
        currentUser = null
        pantryItems = []
        
        localStorage.removeItem('potluck_user')
        
        updateAuthUI()
        updateSectionVisibility()
        
        showMessage('You have been logged out', 'info')
        
        showSection('home')
    }).catch(error => {
        console.error('Error saving data on logout:', error);
        // Still logout even if save fails
        currentUser = null
        pantryItems = []
        localStorage.removeItem('potluck_user')
        updateAuthUI()
        updateSectionVisibility()
        showMessage('Logged out (some data may not have saved)', 'warning')
        showSection('home')
    });
}

function renderPantryItems()
{
    const pantryItemsContainer = document.getElementById('pantryItems')
    if (!pantryItemsContainer) return
    
    pantryItemsContainer.innerHTML = ''
    
    if (pantryItems.length === 0)
    {
        pantryItemsContainer.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: var(--gray);">Your pantry is empty. Add some ingredients!</p>'
        return
    }
    
    pantryItems.forEach(item =>
    {
        const itemElement = document.createElement('div')
        itemElement.className = 'pantry-item'
        itemElement.innerHTML = `
            <div>
                <strong>${item.name}</strong>
                <div style="font-size: 0.9rem; color: var(--gray);">${item.amount}</div>
            </div>
            <div class="item-controls">
                <button onclick="usePantryItem(${item.id})" title="Use in recipe">
                    <i class="fas fa-utensil-spoon"></i>
                </button>
                <button onclick="removePantryItem(${item.id})" title="Remove">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `
        pantryItemsContainer.appendChild(itemElement)
    })
}

async function addPantryItem()
{
    if (!currentUser)
    {
        showAuthForm('login')
        return
    }
    
    const newItemInput = document.getElementById('newItem')
    const amountInput = document.getElementById('itemAmount')
    const name = newItemInput.value.trim()
    const amount = amountInput.value.trim()
    
    if (!name)
    {
        showMessage('Please enter an ingredient name', 'error')
        return
    }
    
    const newItem = {
        id: pantryItems.length > 0 ? Math.max(...pantryItems.map(i => i.id)) + 1 : 1,
        name: name.charAt(0).toUpperCase() + name.slice(1).toLowerCase(),
        amount: amount || 'Some'
    }
    
    pantryItems.push(newItem)
    renderPantryItems()
    
    // Save immediately to both localStorage and server
    await saveUserData()
    
    newItemInput.value = ''
    amountInput.value = ''
    
    showMessage(`Added ${newItem.name} to pantry`, 'success')
}

function removePantryItem(id)
{
    const item = pantryItems.find(item => item.id === id)
    if (item)
    {
        pantryItems = pantryItems.filter(item => item.id !== id)
        renderPantryItems()
        
        // Save immediately
        saveUserData().then(() => {
            showMessage(`Removed ${item.name} from pantry`, 'info')
        }).catch(error => {
            console.error('Error saving after removal:', error);
            showMessage(`Removed ${item.name} (save failed)`, 'warning')
        });
    }
}

function usePantryItem(id)
{
    const item = pantryItems.find(item => item.id === id)
    if (item)
    {
        showMessage(`Using ${item.name} in a recipe`, 'info')
    }
}

function findRecipesFromPantry()
{
    if (!currentUser)
    {
        showAuthForm('login')
        showMessage('Please login to find recipes from your pantry', 'error')
        return
    }
    
    if (pantryItems.length === 0)
    {
        showMessage('Your pantry is empty. Add some ingredients first!', 'error')
        return
    }
    
    // Get pantry ingredient names (lowercase for matching)
    const pantryIngredientNames = pantryItems.map(item => 
        item.name.toLowerCase().split(' ')[0] // Get first word (e.g., "chicken" from "chicken breast")
    )
    
    // Find matching recipes
    const matchingRecipes = allRecipes.filter(recipe => 
    {
        // Check if recipe has any ingredients that match pantry
        return recipe.ingredients.some(ingredient => 
        {
            const ingName = ingredient.toLowerCase().split('(')[0].trim()
            return pantryIngredientNames.some(pantryName => 
                ingName.includes(pantryName) || pantryName.includes(ingName.split(' ')[0])
            )
        })
    })
    
    // Also check user recipes
    const matchingUserRecipes = userRecipes.filter(recipe => 
    {
        return recipe.ingredients.some(ingredient => 
        {
            const ingName = ingredient.toLowerCase().split('(')[0].trim()
            return pantryIngredientNames.some(pantryName => 
                ingName.includes(pantryName) || pantryName.includes(ingName.split(' ')[0])
            )
        })
    })
    
    const allMatchingRecipes = [...matchingRecipes, ...matchingUserRecipes]
    
    if (allMatchingRecipes.length === 0)
    {
        showMessage('No recipes found matching your pantry items. Try adding more ingredients!', 'info')
        return
    }
    
    // Switch to recipes page and filter/show matching recipes
    showSection('recipes')
    
    // Store matching recipes temporarily
    window.matchingPantryRecipes = allMatchingRecipes
    
    // Show message and filter display
    setTimeout(() => {
        showMessage(`Found ${allMatchingRecipes.length} recipes matching your pantry!`, 'success')
        renderFilteredRecipes(allMatchingRecipes)
    }, 100)
}

function renderFilteredRecipes(recipes)
{
    const recipesGrid = document.getElementById('recipesGrid')
    if (!recipesGrid) return
    
    recipesGrid.innerHTML = ''
    
    if (recipes.length === 0)
    {
        recipesGrid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: var(--gray);">No matching recipes found.</p>'
        return
    }
    
    recipes.forEach(recipe =>
    {
        const isSaved = savedRecipes.includes(recipe.id)
        // Check if current user has liked this recipe
        const userLiked = recipe.likedBy && recipe.likedBy.includes(currentUser?.id)
        
        const recipeElement = document.createElement('div')
        recipeElement.className = 'recipe-card'
        recipeElement.onclick = () => showRecipeDetail(recipe)
        
        // Calculate match percentage
        const pantryIngredientNames = pantryItems.map(item => 
            item.name.toLowerCase().split(' ')[0]
        )
        const recipeIngredients = recipe.ingredients.map(ing => 
            ing.toLowerCase().split('(')[0].trim()
        )
        
        const matchingIngredients = recipeIngredients.filter(ing => 
            pantryIngredientNames.some(pantryName => 
                ing.includes(pantryName) || pantryName.includes(ing.split(' ')[0])
            )
        )
        
        const matchPercentage = Math.round((matchingIngredients.length / recipeIngredients.length) * 100)
        
        const ingredientsPreview = recipe.ingredients.slice(0, 3).map(ing => ing.split('(')[0].trim()).join(', ')
        
        recipeElement.innerHTML = `
            <div class="recipe-img">
                <i class="fas fa-${getRecipeIcon(recipe.title)}"></i>
                <div class="match-badge" style="position: absolute; top: 10px; right: 10px; background: var(--accent); color: white; padding: 4px 8px; border-radius: 12px; font-size: 0.8rem; font-weight: bold;">
                    ${matchPercentage}% Match
                </div>
            </div>
            <div class="recipe-content">
                <div class="recipe-header">
                    <h4>${recipe.title}</h4>
                    <div class="recipe-actions">
                        <button onclick="event.stopPropagation(); toggleLike(${recipe.id})" title="${recipe.likes} likes">
                            <i class="fas fa-heart ${userLiked ? 'liked' : ''}"></i>
                        </button>
                        <button onclick="event.stopPropagation(); toggleSaveRecipe(${recipe.id})" title="${isSaved ? 'Saved' : 'Save to cookbook'}">
                            <i class="fas fa-bookmark ${isSaved ? 'saved' : ''}"></i>
                        </button>
                    </div>
                </div>
                <div class="ingredients-preview">
                    <strong>Ingredients:</strong> ${ingredientsPreview}${recipe.ingredients.length > 3 ? '...' : ''}
                    <div style="font-size: 0.8rem; color: var(--secondary); margin-top: 5px;">
                        <i class="fas fa-check-circle"></i> ${matchingIngredients.length} of ${recipeIngredients.length} ingredients in your pantry
                    </div>
                </div>
                <div class="recipe-footer">
                    <div class="recipe-author">By ${recipe.author}</div>
                    <div class="recipe-likes">
                        <i class="fas fa-heart"></i> ${recipe.likes}
                    </div>
                </div>
            </div>
        `
        recipesGrid.appendChild(recipeElement)
    })
    

    const showAllBtn = document.createElement('button')
    showAllBtn.className = 'btn btn-outline'
    showAllBtn.style.cssText = 'grid-column: 1/-1; margin: 1rem auto;'
    showAllBtn.innerHTML = '<i class="fas fa-list"></i> Show All Recipes'
    showAllBtn.onclick = () => {
        window.matchingPantryRecipes = null
        renderRecipes()
        showMessage('Showing all recipes', 'info')
    }
    recipesGrid.appendChild(showAllBtn)
}
    

    const showAllBtn = document.createElement('button')
    showAllBtn.className = 'btn btn-outline'
    showAllBtn.style.cssText = 'grid-column: 1/-1; margin: 1rem auto;'
    showAllBtn.innerHTML = '<i class="fas fa-list"></i> Show All Recipes'
    showAllBtn.onclick = () => {
        window.matchingPantryRecipes = null
        renderRecipes()
        showMessage('Showing all recipes', 'info')
    }
    recipesGrid.appendChild(showAllBtn)


function renderRecipes()
{
    const recipesGrid = document.getElementById('recipesGrid')
    if (!recipesGrid) {
        console.error('recipesGrid element not found!');
        return;
    }

    console.log('renderRecipes called. allRecipes count:', allRecipes.length);
    
    // Check if we should show filtered recipes
    if (window.matchingPantryRecipes)
    {
        console.log('Showing filtered pantry recipes');
        renderFilteredRecipes(window.matchingPantryRecipes)
        return
    }
    
    recipesGrid.innerHTML = ''
    
    if (allRecipes.length === 0)
    {
        console.log('No recipes to display');
        recipesGrid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: var(--gray); padding: 2rem;">No recipes available. Check console for errors.</p>'
        return
    }
    
    console.log('Displaying', allRecipes.length, 'recipes');
    
    allRecipes.forEach(recipe =>
    {
        const isSaved = savedRecipes.includes(recipe.id);
        // Check if current user has liked this recipe
        const userLiked = recipe.likedBy && recipe.likedBy.includes(currentUser?.id);
        
        const recipeElement = document.createElement('div')
        recipeElement.className = 'recipe-card'
        recipeElement.onclick = () => showRecipeDetail(recipe)
        
        // Get first 3 ingredients for preview
        let ingredientsPreview = 'No ingredients listed';
        if (recipe.ingredients && recipe.ingredients.length > 0) {
            ingredientsPreview = recipe.ingredients
                .slice(0, 3)
                .map(ing => {
                    // Extract just the ingredient name (before parentheses if present)
                    const namePart = ing.split('(')[0].trim();
                    return namePart;
                })
                .join(', ');
            
            if (recipe.ingredients.length > 3) {
                ingredientsPreview += '...';
            }
        }
        
        recipeElement.innerHTML = `
            <div class="recipe-img">
                <i class="fas fa-${getRecipeIcon(recipe.title)}"></i>
            </div>
            <div class="recipe-content">
                <div class="recipe-header">
                    <h4>${recipe.title || 'Untitled Recipe'}</h4>
                    <div class="recipe-actions">
                        <button onclick="event.stopPropagation(); toggleLike(${recipe.id})" title="${recipe.likes} likes">
                            <i class="fas fa-heart ${userLiked ? 'liked' : ''}"></i>
                        </button>
                        <button onclick="event.stopPropagation(); toggleSaveRecipe(${recipe.id})" title="${isSaved ? 'Saved' : 'Save to cookbook'}">
                            <i class="fas fa-bookmark ${isSaved ? 'saved' : ''}"></i>
                        </button>
                    </div>
                </div>
                <div class="ingredients-preview">
                    <strong>Ingredients:</strong> ${ingredientsPreview}
                </div>
                <div class="recipe-footer">
                    <div class="recipe-author">By ${recipe.author || 'Unknown'}</div>
                    <div class="recipe-likes">
                        <i class="fas fa-heart"></i> ${recipe.likes}
                    </div>
                </div>
            </div>
        `
        recipesGrid.appendChild(recipeElement)
    })
    
    console.log('Finished rendering recipes');
}

function getRecipeIcon(title)
{
    const lowerTitle = title.toLowerCase()
    if (lowerTitle.includes('cookie')) return 'cookie-bite'
    if (lowerTitle.includes('bread')) return 'bread-slice'
    if (lowerTitle.includes('soup')) return 'bowl-food'
    if (lowerTitle.includes('chicken')) return 'drumstick-bite'
    if (lowerTitle.includes('vegetable') || lowerTitle.includes('stir')) return 'carrot'
    if (lowerTitle.includes('pasta')) return 'utensils'
    return 'utensils'
}

function showRecipeDetail(recipe)
{
    document.getElementById('detailTitle').textContent = recipe.title
    document.getElementById('detailAuthor').textContent = `By ${recipe.author}`
    document.getElementById('likeCount').textContent = recipe.likes
    
    const ingredientsList = document.getElementById('detailIngredients')
    ingredientsList.innerHTML = ''
    
    // Get ingredients as string
    let ingredientsStr = recipe.ingredients || ''
    
    // If it's an array, join it back to string
    if (Array.isArray(ingredientsStr)) {
        ingredientsStr = ingredientsStr.join(',')
    }
    
    // Remove quotes if present
    if (ingredientsStr.startsWith('"') && ingredientsStr.endsWith('"')) {
        ingredientsStr = ingredientsStr.slice(1, -1)
    }
    
    // Split by comma and filter out empty strings
    const ingredientsArray = ingredientsStr
        .split(',')
        .map(ing => ing.trim())
        .filter(ing => ing.length > 0)
    
    // Display each ingredient on its own line
    ingredientsArray.forEach(ingredient => {
        const div = document.createElement('div')
        div.textContent = `• ${ingredient}`
        div.style.cssText = `
            padding: 10px 0;
            border-bottom: 1px solid #e0e0e0;
            margin: 0;
            font-size: 16px;
            line-height: 1.5;
        `
        ingredientsList.appendChild(div)
    })
    
    // Remove border from last item
    const children = ingredientsList.children
    if (children.length > 0) {
        children[children.length - 1].style.borderBottom = 'none'
    }
    
    const instructionsDiv = document.getElementById('detailInstructions')
    instructionsDiv.innerHTML = ''
    
    // Handle instructions
    let instructionsStr = recipe.instructions || ''
    if (Array.isArray(instructionsStr)) {
        instructionsStr = instructionsStr.join('|')
    }
    
    if (instructionsStr.startsWith('"') && instructionsStr.endsWith('"')) {
        instructionsStr = instructionsStr.slice(1, -1)
    }
    
    const instructionsArray = instructionsStr
        .split('|')
        .map(step => step.trim())
        .filter(step => step.length > 0)
    
    instructionsArray.forEach((step, index) =>
    {
        const stepDiv = document.createElement('div')
        stepDiv.className = 'instruction-step'
        stepDiv.innerHTML = `<span class="step-number">${index + 1}</span>${step}`
        instructionsDiv.appendChild(stepDiv)
    })
    
    recipeDetail.style.display = 'block'
}

function closeRecipeDetail()
{
    recipeDetail.style.display = 'none'
}

async function toggleLike(recipeId)
{
    if (!currentUser)
    {
        showAuthForm('login')
        showMessage('Please login to like recipes', 'error')
        return
    }
    
    const recipe = allRecipes.find(r => r.id === recipeId)
    
    if (recipe)
    {
        // Check if user already liked this recipe
        if (!recipe.likedBy) {
            recipe.likedBy = []
        }
        
        const userLikedIndex = recipe.likedBy.indexOf(currentUser.id)
        
        if (userLikedIndex === -1) {
            // User hasn't liked it yet - add like
            recipe.likes += 1
            recipe.likedBy.push(currentUser.id)
            showMessage(`Liked "${recipe.title}"`, 'success')
        } else {
            // User already liked it - remove like
            recipe.likes -= 1
            recipe.likedBy.splice(userLikedIndex, 1)
            showMessage(`Unliked "${recipe.title}"`, 'info')
        }
        
        // Update on server
        try {
            await fetch(`${API_BASE}/recipes/${recipeId}/like`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ likes: recipe.likes })
            });
        } catch (error) {
            console.error('Failed to save like to server:', error);
            // Continue anyway - at least local state is updated
        }
        
        renderRecipes()
        
        if (recipeDetail.style.display === 'block' && document.getElementById('detailTitle').textContent === recipe.title)
        {
            document.getElementById('likeCount').textContent = recipe.likes
        }
    }
}

function toggleSaveRecipe(recipeId)
{
    if (!currentUser)
    {
        showAuthForm('login')
        showMessage('Please login to save recipes', 'error')
        return
    }
    
    const recipe = allRecipes.find(r => r.id === recipeId)
    const index = savedRecipes.indexOf(recipeId)
    
    if (index === -1)
    {
        savedRecipes.push(recipeId)
        showMessage(`Saved "${recipe.title}" to your cookbook`, 'success')
    }
    else
    {
        savedRecipes.splice(index, 1)
        showMessage(`Removed "${recipe.title}" from cookbook`, 'info')
    }
    
    if (document.getElementById('recipes-section').style.display === 'block')
    {
        renderRecipes()
    }
    
    if (document.getElementById('cookbookContent').style.display === 'block')
    {
        renderCookbook()
    }
}

function renderCookbook()
{
    const cookbookGrid = document.getElementById('cookbookGrid')
    const emptyCookbook = document.getElementById('emptyCookbook')
    
    if (!cookbookGrid) return
    
    cookbookGrid.innerHTML = ''
    
    const savedRecipesToShow = allRecipes.filter(recipe => savedRecipes.includes(recipe.id))
    
    if (savedRecipesToShow.length === 0)
    {
        cookbookGrid.style.display = 'none'
        emptyCookbook.style.display = 'block'
        return
    }
    
    cookbookGrid.style.display = 'grid'
    emptyCookbook.style.display = 'none'
    
    savedRecipesToShow.forEach(recipe =>
    {
        // Check if current user has liked this recipe
        const userLiked = recipe.likedBy && recipe.likedBy.includes(currentUser?.id)
        
        const recipeElement = document.createElement('div')
        recipeElement.className = 'recipe-card'
        recipeElement.onclick = () => showRecipeDetail(recipe)
        
        recipeElement.innerHTML = `
            <div class="recipe-img">
                <i class="fas fa-${getRecipeIcon(recipe.title)}"></i>
            </div>
            <div class="recipe-content">
                <div class="recipe-header">
                    <h4>${recipe.title}</h4>
                    <div class="recipe-actions">
                        <button onclick="event.stopPropagation(); toggleLike(${recipe.id})" title="${recipe.likes} likes">
                            <i class="fas fa-heart ${userLiked ? 'liked' : ''}"></i>
                        </button>
                        <button onclick="event.stopPropagation(); toggleSaveRecipe(${recipe.id})" title="Remove from cookbook">
                            <i class="fas fa-bookmark saved"></i>
                        </button>
                    </div>
                </div>
                <div class="ingredients-preview">
                    <strong>Ingredients:</strong> ${recipe.ingredients.slice(0, 3).map(ing => ing.split('(')[0].trim()).join(', ')}${recipe.ingredients.length > 3 ? '...' : ''}
                </div>
                <div class="recipe-footer">
                    <div class="recipe-author">By ${recipe.author}</div>
                    <div class="recipe-likes">
                        <i class="fas fa-heart"></i> ${recipe.likes}
                    </div>
                </div>
            </div>
        `
        cookbookGrid.appendChild(recipeElement)
    })
}

function filterCookbook(filter)
{
    showMessage(`Filtering cookbook by: ${filter}`, 'info')
    renderCookbook()
}

function renderCommunityRecipes()
{
    const communityGrid = document.getElementById('communityGrid')
    if (!communityGrid) return
    
    communityGrid.innerHTML = ''
    
    const allCommunityRecipes = [...allRecipes, ...userRecipes]
    
    if (allCommunityRecipes.length === 0)
    {
        communityGrid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: var(--gray);">No community recipes yet.</p>'
        return
    }
    
    allCommunityRecipes.sort((a, b) => b.likes - a.likes)
    
    allCommunityRecipes.forEach(recipe =>
    {
        const isUserRecipe = userRecipes.some(r => r.id === recipe.id)
        const isSaved = savedRecipes.includes(recipe.id)
        // Check if current user has liked this recipe
        const userLiked = recipe.likedBy && recipe.likedBy.includes(currentUser?.id)
        
        const recipeElement = document.createElement('div')
        recipeElement.className = 'recipe-card'
        recipeElement.onclick = () => showRecipeDetail(recipe)
        
        recipeElement.innerHTML = `
            <div class="recipe-img">
                <i class="fas fa-${isUserRecipe ? 'user-check' : getRecipeIcon(recipe.title)}"></i>
            </div>
            <div class="recipe-content">
                <div class="recipe-header">
                    <h4>${recipe.title}</h4>
                    <div class="recipe-actions">
                        <button onclick="event.stopPropagation(); toggleLike(${recipe.id})" title="${recipe.likes} likes">
                            <i class="fas fa-heart ${userLiked ? 'liked' : ''}"></i>
                        </button>
                        <button onclick="event.stopPropagation(); toggleSaveRecipe(${recipe.id})" title="${isSaved ? 'Saved' : 'Save to cookbook'}">
                            <i class="fas fa-bookmark ${isSaved ? 'saved' : ''}"></i>
                        </button>
                    </div>
                </div>
                <div class="ingredients-preview">
                    <strong>Ingredients:</strong> ${recipe.ingredients.slice(0, 3).map(ing => ing.split('(')[0].trim()).join(', ')}${recipe.ingredients.length > 3 ? '...' : ''}
                </div>
                <div class="recipe-footer">
                    <div class="recipe-author">By ${recipe.author} ${isUserRecipe ? '(You)' : ''}</div>
                    <div class="recipe-likes">
                        <i class="fas fa-heart"></i> ${recipe.likes}
                    </div>
                </div>
            </div>
        `
        communityGrid.appendChild(recipeElement)
    })
}

async function uploadRecipe()
{
    if (!currentUser)
    {
        showAuthForm('login')
        showMessage('Please login to upload recipes', 'error')
        return
    }
    
    const title = document.getElementById('recipeTitle').value
    const ingredients = document.getElementById('recipeIngredients').value
    const instructions = document.getElementById('recipeInstructions').value
    
    if (!title || !ingredients || !instructions)
    {
        showMessage('Please fill all recipe fields', 'error')
        return
    }
    
    const ingredientsArray = ingredients.split(',').map(ing => ing.trim()).filter(ing => ing);
    const instructionsArray = instructions.split('.').filter(step => step.trim()).map(step => step.trim() + '.');
    
    const newRecipe = {
        title: title,
        ingredients: ingredientsArray,
        instructions: instructionsArray,
        author: currentUser.name,
        likes: 0,
        matchPercentage: Math.floor(Math.random() * 30) + 70,
        prepTime: "10 min",
        cookTime: "20 min"
    }
    
    try {
        // Send to backend API to save to CSV
        const response = await fetch(`${API_BASE}/recipes`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(newRecipe)
        })
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to save recipe');
        }
        
        const result = await response.json();
        const savedRecipe = result.recipe;
        
        // Add to local arrays
        userRecipes.push(savedRecipe);
        
        // Also add to allRecipes for display
        allRecipes.push({
            ...savedRecipe,
            likedBy: []
        });
        
        // Auto-save to cookbook
        if (!savedRecipes.includes(savedRecipe.id)) {
            savedRecipes.push(savedRecipe.id);
        }
        
        // Clear form
        document.getElementById('recipeTitle').value = ''
        document.getElementById('recipeIngredients').value = ''
        document.getElementById('recipeInstructions').value = ''
        
        showMessage(`"${title}" uploaded and saved to cookbook!`, 'success')
        
        // Refresh displays
        renderCommunityRecipes()
        renderCookbook()
        
        // Reload recipes from server to get updated list
        await loadRecipesFromCSV();
        
    } catch (error) {
        console.error('Recipe upload error:', error);
        showMessage(`Failed to upload recipe: ${error.message}`, 'error');
    }
}

async function initApp()
{
    console.log('Initializing app...');
    
    await loadUsersFromCSV();
    await loadRecipesFromCSV();
    
    console.log('After loading - allRecipes count:', allRecipes.length);
    console.log('Sample recipe:', allRecipes[0]);
    
    const savedUser = localStorage.getItem('potluck_user')
    if (savedUser)
    {
        try
        {
            currentUser = JSON.parse(savedUser)
            
            const savedPantry = localStorage.getItem(`potluck_pantry_${currentUser.id}`)
            if (savedPantry)
            {
                pantryItems = JSON.parse(savedPantry)
            }
            else
            {
                const user = allUsers.find(u => u.id == currentUser.id)
                pantryItems = user && user.pantryItems ? [...user.pantryItems] : []
            }
        }
        catch (e)
        {
            console.error('Error loading user data:', e)
            currentUser = null
            pantryItems = []
        }
    }
    
    updateAuthUI()
    
    showSection('home')
    
    console.log('App initialization complete');
}

document.addEventListener('DOMContentLoaded', initApp)