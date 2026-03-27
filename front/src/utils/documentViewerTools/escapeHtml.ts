/**
 * Permet de parse toute annotation de script dans un texte. A utiliser afin de sécuriser les injections de script
 * 
 * @param { string } str - Une chaine de caractère à sécuriser
 * @returns { string } 
 */
export function escapeHtml(str: string) {
    return str.replace(/[&<>"]/g, c => {
        switch (c) {
            case '&': return '&amp;';
            case '<': return '&lt;';
            case '>': return '&gt;';
            case '"': return '&quot;';
            default: return c;
        }
    });
}