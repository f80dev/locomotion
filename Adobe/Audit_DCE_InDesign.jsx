#target illustrator

// ============================================================================
// SCRIPT : Compteur Automatique de Signalétique & Export DPGF (CSV)
// Compatible : Adobe Illustrator CC (Mac / Windows)
// ============================================================================

function main() {
    if (app.documents.length === 0) {
        alert("Veuillez ouvrir un document Illustrator contenant vos plans.");
        return;
    }

    var doc = app.activeDocument;

    // Dictionnaire officiel (Codes Symboles -> Libellés exacts du DCE Tour F)
    var dictionnaire = {
        "RG": "répertoires généraux",
        "RA": "répertoires ascenseurs",
        "RC": "répertoires cabines ascenseurs",
        "Red": "répertoires étages directionnels",
        "Dir": "directionnels muraux",
        "D": "drapeaux",
        "DA": "directionnels ascenseurs",
        "Ib": "identifications batteries",
        "Ino": "identifications nobles",
        "Ise": "identifications secondaires",
        "P": "identifications plateaux",
        "Pm": "plaques de portes modulables",
        "Pl": "plaques de portes de lot",
        "n°": "N° étages ascenseurs",
        "(n)": "N° étages escaliers",
        "Pi": "pictogrammes (toilettes, escaliers)",
        "PMR": "pictogrammes PMR",
        "LT": "locaux techniques",
        "AR": "accès réservés"
    };

    var nbArtboards = doc.artboards.length;
    var resultatsParPlan = [];
    var tousLesTypesTrouves = {};

    // Initialiser la structure pour chaque plan de travail (Artboard / Niveau)
    for (var a = 0; a < nbArtboards; a++) {
        resultatsParPlan.push({
            nomNiveau: doc.artboards[a].name,
            compteurs: {}
        });
    }

    // Parcourir toutes les instances de symboles posées dans le document
    for (var i = 0; i < doc.symbolItems.length; i++) {
        var item = doc.symbolItems[i];

        // Ignorer les symboles masqués ou sur des calques invisibles
        if (item.hidden || !item.layer.visible) continue;

        var nomSymbole = item.symbol.name;

        // Centre géométrique de la pastille pour savoir sur quel plan de travail elle se trouve
        var bounds = item.geometricBounds; // [left, top, right, bottom]
        var centerX = (bounds[0] + bounds[2]) / 2;
        var centerY = (bounds[1] + bounds[3]) / 2;

        for (var j = 0; j < nbArtboards; j++) {
            var abRect = doc.artboards[j].artboardRect; // [left, top, right, bottom]
            if (centerX >= abRect[0] && centerX <= abRect[2] && centerY <= abRect[1] && centerY >= abRect[3]) {
                if (!resultatsParPlan[j].compteurs[nomSymbole]) {
                    resultatsParPlan[j].compteurs[nomSymbole] = 0;
                }
                resultatsParPlan[j].compteurs[nomSymbole]++;
                tousLesTypesTrouves[nomSymbole] = true;
                break;
            }
        }
    }

    // Créer ou récupérer un calque dédié aux tableaux de légendes générés
    var calqueTableau;
    try {
        calqueTableau = doc.layers.getByName("TABLEAUX_QUANTITATIFS_AUTO");
    } catch (e) {
        calqueTableau = doc.layers.add();
        calqueTableau.name = "TABLEAUX_QUANTITATIFS_AUTO";
    }

    // 1. Générer le bloc texte de légende à droite de chaque plan de travail
    for (var k = 0; k < nbArtboards; k++) {
        var ab = doc.artboards[k].artboardRect;
        var data = resultatsParPlan[k];
        var lignesTexte = ["SIGNALÉTIQUE STRUCTURELLE"];
        var totalNiveau = 0;

        for (var code in data.compteurs) {
            var qte = data.compteurs[code];
            if (qte > 0) {
                var libelle = dictionnaire[code] ? dictionnaire[code] : code;
                lignesTexte.push(code + "\t" + libelle + "\t" + qte);
                totalNiveau += qte;
            }
        }

        if (totalNiveau > 0) {
            var tf = calqueTableau.textFrames.add();
            tf.contents = lignesTexte.join("\r");
            // Positionnement automatique dans le coin inférieur droit du plan de travail
            tf.position = [ab[2] - 240, ab[3] + 280];
            tf.textRange.characterAttributes.size = 9;
        }
    }

    // 2. Proposer l'export en fichier CSV (ouvrable directement dans Excel)
    if (confirm("Comptage terminé sur " + nbArtboards + " plan(s) !\nLes légendes ont été générées sur le calque 'TABLEAUX_QUANTITATIFS_AUTO'.\n\nVoulez-vous exporter le métré récapitulatif complet en CSV (Excel) ?")) {
        var fichierCSV = File.saveDialog("Enregistrer le métré CSV", "*.csv");
        if (fichierCSV) {
            fichierCSV.encoding = "UTF-8";
            fichierCSV.open("w");
            // Ajouter le BOM UTF-8 pour qu'Excel lise correctement les accents (é, °, etc.)
            fichierCSV.write("\uFEFF");

            var clesSymboles = [];
            var ligneEntete = ["Niveau / Plan de travail"];
            for (var sym in tousLesTypesTrouves) {
                clesSymboles.push(sym);
                var nomCol = dictionnaire[sym] ? (sym + " - " + dictionnaire[sym]) : sym;
                ligneEntete.push('"' + nomCol + '"');
            }
            fichierCSV.writeln(ligneEntete.join(";"));

            // Écrire une ligne par étage
            for (var p = 0; p < nbArtboards; p++) {
                var ligne = ['"' + resultatsParPlan[p].nomNiveau + '"'];
                for (var s = 0; s < clesSymboles.length; s++) {
                    var cle = clesSymboles[s];
                    var val = resultatsParPlan[p].compteurs[cle] || 0;
                    ligne.push(val);
                }
                fichierCSV.writeln(ligne.join(";"));
            }
            fichierCSV.close();
            alert("Export Excel/CSV réussi !");
        }
    }
}

main();