export const AutoCompleteManager = {
    dropdown: null,
    suggestions: [],
    selectedIndex: 0,
    currentWord: '',
    
    init(editor) {
        editor.addEventListener('input', (e) => this.handleInput(e));
        editor.addEventListener('keydown', (e) => this.handleKeydown(e));
    },
    
    handleInput(e) {
        const word = this.getCurrentWord(e.target);
        this.currentWord = word;
        const suggestions = this.getSuggestions(word);
        if (suggestions.length > 0) {
            this.show(e.target, suggestions);
        } else {
            this.hide();
        }
    },
    
    handleKeydown(e) {
        if (!this.dropdown) return;
        
        switch(e.key) {
            case 'ArrowDown':
                e.preventDefault();
                this.selectedIndex = (this.selectedIndex + 1) % this.suggestions.length;
                this.updateSelection();
                break;
                
            case 'ArrowUp':
                e.preventDefault();
                this.selectedIndex = (this.selectedIndex - 1 + this.suggestions.length) % this.suggestions.length;
                this.updateSelection();
                break;
                
            case 'Enter':
                e.preventDefault();
                this.selectCurrent();
                break;
                
            case 'Escape':
                e.preventDefault();
                this.hide();
                break;
        }
    },
    
    getCurrentWord(editor) {
        const selection = window.getSelection();
        if (!selection.rangeCount) return '';
        
        const range = selection.getRangeAt(0);
        const preCaretRange = range.cloneRange();
        preCaretRange.selectNodeContents(editor);
        preCaretRange.setEnd(range.endContainer, range.endOffset);
        
        const text = preCaretRange.toString();
        const match = text.match(/\b\w*$/);
        return match ? match[0] : '';
    },
    
    getSuggestions(word) {
        if (!word || word.length < 1) return [];
        
        const suggestions = new Set();
        
        // Add from editorContext
        Object.keys(editorContext).forEach(key => {
            if (key.toLowerCase().startsWith(word.toLowerCase())) {
                suggestions.add(key);
            }
        });
        
        // Add built-in suggestions
        builtInSuggestions.forEach(suggestion => {
            if (suggestion.toLowerCase().startsWith(word.toLowerCase())) {
                suggestions.add(suggestion);
            }
        });
        
        return Array.from(suggestions).sort();
    },
    
    show(editor, suggestions) {
        this.hide();
        
        if (suggestions.length === 0) return;
        
        this.suggestions = suggestions;
        this.selectedIndex = 0;
        
        // Create dropdown
        this.dropdown = document.createElement('div');
        this.dropdown.className = 'autocomplete-dropdown';
        
        suggestions.forEach((suggestion, index) => {
            const item = document.createElement('div');
            item.className = 'autocomplete-item';
            item.textContent = suggestion;
            item.dataset.index = index;
            
            if (index === 0) item.classList.add('selected');
            
            item.addEventListener('click', () => {
                this.selectSuggestion(suggestion);
            });
            
            item.addEventListener('mouseenter', () => {
                this.selectedIndex = index;
                this.updateSelection();
            });
            
            this.dropdown.appendChild(item);
        });
        
        // Position dropdown at cursor
        const rect = editor.getBoundingClientRect();
        this.dropdown.style.position = 'fixed';
        this.dropdown.style.top = (rect.top + 30) + 'px';
        this.dropdown.style.left = (rect.left + 20) + 'px';
        
        document.body.appendChild(this.dropdown);
    },
    
    selectCurrent() {
        if (this.suggestions.length > 0) {
            this.selectSuggestion(this.suggestions[this.selectedIndex]);
        }
    },
    
    selectSuggestion(suggestion) {
        const selection = window.getSelection();
        const range = selection.getRangeAt(0);
        
        // Replace the current word with suggestion
        range.setStart(range.endContainer, range.endOffset - this.currentWord.length);
        range.deleteContents();
        
        const textNode = document.createTextNode(suggestion + ' ');
        range.insertNode(textNode);
        
        // Move cursor after inserted text
        range.setStartAfter(textNode);
        range.collapse(true);
        selection.removeAllRanges();
        selection.addRange(range);
        
        this.hide();
    },
    
    updateSelection() {
        document.querySelectorAll('.autocomplete-item').forEach((el, index) => {
            el.classList.toggle('selected', index === this.selectedIndex);
        });
    },
    
    hide() {
        if (this.dropdown) {
            this.dropdown.remove();
            this.dropdown = null;
            this.suggestions = [];
            this.selectedIndex = 0;
        }
    }
};