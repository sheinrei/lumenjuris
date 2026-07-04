/* global Office */

Office.onReady(() => {
  // Office.js est prêt.
});

/**
 * Commande de ruban (FunctionFile). Le POC n'expose que le bouton
 * « Afficher le volet », mais le FunctionFile doit exister et être valide.
 */
function action(event: Office.AddinCommands.Event) {
  event.completed();
}

Office.actions.associate("action", action);
