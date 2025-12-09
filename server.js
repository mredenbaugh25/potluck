const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const cors = require('cors');
const app = express();
const PORT = process.env.PORT || 3000; 

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('.'));

const DATA_PATH = path.join(__dirname, 'data');
const USERS_CSV = path.join(DATA_PATH, 'users.csv');
const RECIPES_CSV = path.join(DATA_PATH, 'recipes.csv');

// Helper to escape CSV fields
function escapeCSVField(field) {
    if (field === null || field === undefined) return '';
    const stringField = String(field);
    if (stringField.includes(',') || stringField.includes('"') || stringField.includes('\n')) {
        return '"' + stringField.replace(/"/g, '""') + '"';
    }
    return stringField;
}

// ========== API ENDPOINTS ==========

// GET all users
app.get('/api/users', async (req, res) => {
    try {
        const csvText = await fs.readFile(USERS_CSV, 'utf8');
        res.setHeader('Content-Type', 'text/csv');
        res.send(csvText);
    } catch (error) {
        console.error('Error reading users:', error.message);
        res.status(500).json({ error: 'Failed to read users file' });
    }
});

// GET all recipes
app.get('/api/recipes', async (req, res) => {
    try {
        const csvText = await fs.readFile(RECIPES_CSV, 'utf8');
        res.setHeader('Content-Type', 'text/csv');
        res.send(csvText);
    } catch (error) {
        console.error('Error reading recipes:', error.message);
        res.status(500).json({ error: 'Failed to read recipes file' });
    }
});

// POST new user
app.post('/api/users', async (req, res) => {
    try {
        const newUser = req.body;
        
        if (!newUser.name || !newUser.email || !newUser.password) {
            return res.status(400).json({ error: 'Missing required fields' });
        }
        
        const csvText = await fs.readFile(USERS_CSV, 'utf8');
        const lines = csvText.trim().split('\n');
        
        let newId = 1;
        if (lines.length > 1) {
            const lastLine = lines[lines.length - 1];
            const firstComma = lastLine.indexOf(',');
            const lastId = parseInt(lastLine.substring(0, firstComma)) || 0;
            newId = lastId + 1;
        }
        
        const createdDate = new Date().toISOString().split('T')[0];
        const escapedName = escapeCSVField(newUser.name);
        const escapedEmail = escapeCSVField(newUser.email);
        const newUserLine = `${newId},${escapedName},${escapedEmail},${newUser.password},${createdDate},`;
        
        const appendText = csvText.trim().length > 0 ? '\n' + newUserLine : newUserLine;
        await fs.appendFile(USERS_CSV, appendText);
        
        console.log('New user saved:', newUser.email);
        
        res.json({ 
            success: true, 
            user: {
                id: newId.toString(),
                name: newUser.name,
                email: newUser.email,
                password: newUser.password,
                created_date: createdDate,
                pantry: '',
                pantryItems: []
            }
        });
    } catch (error) {
        console.error('Error adding user:', error.message);
        res.status(500).json({ error: 'Failed to add user' });
    }
});

// PUT update user pantry
app.put('/api/users/:id/pantry', async (req, res) => {
    try {
        const userId = req.params.id;
        const { pantry } = req.body;
        
        if (pantry === undefined) {
            return res.status(400).json({ error: 'Missing pantry data' });
        }
        
        const csvText = await fs.readFile(USERS_CSV, 'utf8');
        const lines = csvText.split('\n');
        
        let updated = false;
        const updatedLines = lines.map((line, index) => {
            if (index === 0) return line;
            
            const firstComma = line.indexOf(',');
            const lineId = line.substring(0, firstComma);
            
            if (lineId === userId.toString()) {
                const parts = [];
                let current = '';
                let inQuotes = false;
                
                for (let char of line) {
                    if (char === '"') {
                        inQuotes = !inQuotes;
                    } else if (char === ',' && !inQuotes) {
                        parts.push(current);
                        current = '';
                    } else {
                        current += char;
                    }
                }
                parts.push(current);
                
                if (parts.length >= 6) {
                    parts[5] = pantry;
                    updated = true;
                    return parts.map(part => escapeCSVField(part)).join(',');
                }
            }
            return line;
        });
        
        if (!updated) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        await fs.writeFile(USERS_CSV, updatedLines.join('\n'));
        console.log('Pantry updated for user:', userId);
        
        res.json({ success: true });
    } catch (error) {
        console.error('Error updating pantry:', error.message);
        res.status(500).json({ error: 'Failed to update pantry' });
    }
});

// POST new recipe
app.post('/api/recipes', async (req, res) => {
    console.log('=== RECIPE UPLOAD REQUEST ===');
    
    try {
        const newRecipe = req.body;
        
        // Validate
        if (!newRecipe.title || !newRecipe.ingredients || !newRecipe.instructions) {
            console.error('Missing fields:', { 
                title: !!newRecipe.title, 
                ingredients: !!newRecipe.ingredients,
                instructions: !!newRecipe.instructions 
            });
            return res.status(400).json({ error: 'Missing required fields' });
        }
        
        console.log('Reading recipes CSV...');
        const csvText = await fs.readFile(RECIPES_CSV, 'utf8');
        const lines = csvText.trim().split('\n');
        
        // Generate new ID
        let newId = 1;
        if (lines.length > 1) {
            const lastLine = lines[lines.length - 1];
            const firstComma = lastLine.indexOf(',');
            const lastId = parseInt(lastLine.substring(0, firstComma)) || 0;
            newId = lastId + 1;
        }
        
        console.log('New recipe ID:', newId);
        
        // Prepare data for CSV
        const ingredientsStr = Array.isArray(newRecipe.ingredients) 
            ? newRecipe.ingredients.join(',')
            : String(newRecipe.ingredients);
            
        const instructionsStr = Array.isArray(newRecipe.instructions)
            ? newRecipe.instructions.join('|')
            : String(newRecipe.instructions);
        
        // Escape fields
        const escapedTitle = escapeCSVField(newRecipe.title);
        const escapedIngredients = ingredientsStr.includes(',') ? `"${ingredientsStr}"` : ingredientsStr;
        const escapedInstructions = instructionsStr.includes(',') || instructionsStr.includes('|') 
            ? `"${instructionsStr}"` 
            : instructionsStr;
        const escapedAuthor = escapeCSVField(newRecipe.author || 'Unknown');
        const escapedPrepTime = escapeCSVField(newRecipe.prepTime || "10 min");
        const escapedCookTime = escapeCSVField(newRecipe.cookTime || "20 min");
        
        // Create CSV line
        const newRecipeLine = `${newId},${escapedTitle},${escapedIngredients},${escapedInstructions},${escapedAuthor},${newRecipe.likes || 0},true,${newRecipe.matchPercentage || 75},${escapedPrepTime},${escapedCookTime}`;
        
        console.log('Recipe CSV line:', newRecipeLine);
        
        // Append to file
        const appendText = csvText.trim().length > 0 ? '\n' + newRecipeLine : newRecipeLine;
        await fs.appendFile(RECIPES_CSV, appendText);
        
        console.log('Recipe saved to CSV successfully');
        
        // Return success response
        res.json({ 
            success: true, 
            recipe: {
                id: newId,
                title: newRecipe.title,
                ingredients: Array.isArray(newRecipe.ingredients) ? newRecipe.ingredients : [newRecipe.ingredients],
                instructions: Array.isArray(newRecipe.instructions) ? newRecipe.instructions : [newRecipe.instructions],
                author: newRecipe.author || 'Unknown',
                likes: newRecipe.likes || 0,
                isUserRecipe: true,
                matchPercentage: newRecipe.matchPercentage || 75,
                prepTime: newRecipe.prepTime || "10 min",
                cookTime: newRecipe.cookTime || "20 min"
            }
        });
        
    } catch (error) {
        console.error('ERROR in recipe upload:', error.message);
        console.error('Error stack:', error.stack);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to save recipe: ' + error.message 
        });
    }
});

// PUT update recipe likes
app.put('/api/recipes/:id/like', async (req, res) => {
    try {
        const recipeId = req.params.id;
        const { likes } = req.body;
        
        if (likes === undefined) {
            return res.status(400).json({ error: 'Missing likes data' });
        }
        
        const csvText = await fs.readFile(RECIPES_CSV, 'utf8');
        const lines = csvText.split('\n');
        
        let updated = false;
        const updatedLines = lines.map((line, index) => {
            if (index === 0) return line;
            
            const parts = line.split(',');
            if (parts.length >= 10 && parts[0] === recipeId.toString()) {
                parts[5] = likes.toString();
                updated = true;
                return parts.join(',');
            }
            return line;
        });
        
        if (!updated) {
            return res.status(404).json({ error: 'Recipe not found' });
        }
        
        await fs.writeFile(RECIPES_CSV, updatedLines.join('\n'));
        res.json({ success: true });
    } catch (error) {
        console.error('Error updating likes:', error.message);
        res.status(500).json({ error: 'Failed to update likes' });
    }
});

// Debug endpoint
app.get('/api/debug', (req, res) => {
    res.json({
        server: 'running',
        timestamp: new Date().toISOString(),
        endpoints: {
            users: 'GET /api/users',
            recipes: 'GET /api/recipes',
            register: 'POST /api/users',
            pantry: 'PUT /api/users/:id/pantry',
            upload: 'POST /api/recipes',
            like: 'PUT /api/recipes/:id/like'
        }
    });
});

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Start server
app.listen(PORT, () => {
    console.log('========================================');
    console.log(`Potluck Server running on port ${PORT}`);
    console.log(`Local: http://localhost:${PORT}`);
    console.log('========================================');
    console.log('Test endpoints:');
    console.log(`  GET  /api/debug - Server info`);
    console.log(`  GET  /api/recipes - Recipes CSV`);
    console.log(`  POST /api/recipes - Upload recipe`);
    console.log('========================================');
});