import { collection, addDoc } from 'firebase/firestore';
import { db } from './src/services/firebase.js';
import { Gem, Channel, Topic, Source, User, UserRole, TopicSuggestion } from './src/types.js';
import { getDefaultPermissions } from './src/services/roleService.js';

const sampleChannels: Omit<Channel, 'id'>[] = [
    {
        name: "Cultura Generale",
        description: "Esplora curiosità e fatti interessanti dal mondo.",
        emoji: "🌍",
        filterTags: ["storia", "arte", "geografia", "letteratura"]
    },
    {
        name: "Scienza & Tech",
        description: "Le ultime scoperte e le tecnologie del futuro.",
        emoji: "🔬",
        filterTags: ["AI", "spazio", "biologia", "fisica", "tecnologia"]
    },
    {
        name: "Benessere Personale",
        description: "Consigli per mente e corpo.",
        emoji: "🧘",
        filterTags: ["mindfulness", "produttività", "salute", "psicologia"]
    },
    {
        name: "Arte & Creatività",
        description: "Ispirazioni dal mondo dell'arte e del design.",
        emoji: "🎨",
        filterTags: ["pittura", "design", "architettura", "creatività"]
    },
    {
        name: "Economia & Società",
        description: "Tendenze economiche e sociali contemporanee.",
        emoji: "💼",
        filterTags: ["economia", "finanza", "società", "politica"]
    }
];

const sampleGems: Omit<Gem, 'id'>[] = [
    {
        topic: Topic.GENERAL_CULTURE,
        title: "L'origine delle spezie e il loro impatto sulla storia",
        description: "Un viaggio attraverso la storia del commercio delle spezie e come hanno influenzato le scoperte geografiche, le guerre e lo sviluppo delle civiltà.",
        imageUrl: "https://images.unsplash.com/photo-1552318965-6e6be7484ada?q=80&w=2070&auto=format&fit=crop",
        userQuestions: [],
        tags: ["storia", "cibo", "commercio"],
        suggestedQuestions: [
            "Qual era la spezia più preziosa nell'antichità?",
            "Come ha influenzato le scoperte geografiche?",
            "Quali erano le principali rotte commerciali?"
        ],
        sources: [
            { title: "Wikipedia - Via delle spezie", uri: "https://it.wikipedia.org/wiki/Via_delle_spezie" },
            { title: "National Geographic - Spice Routes", uri: "https://www.nationalgeographic.com/history/article/spice-trade" }
        ]
    },
    {
        topic: Topic.SCIENCE_TECH,
        title: "Come funzionano le reti neurali artificiali",
        description: "Una spiegazione accessibile del funzionamento delle reti neurali, i mattoni fondamentali dell'intelligenza artificiale moderna, con esempi pratici.",
        imageUrl: "https://images.unsplash.com/photo-1599420186946-7b6fb4e297f0?q=80&w=1974&auto=format&fit=crop",
        userQuestions: [],
        tags: ["AI", "informatica", "machine learning"],
        suggestedQuestions: [
            "Cos'è un neurone artificiale?",
            "Quali sono le principali applicazioni?",
            "Come si addestra una rete neurale?"
        ],
        sources: [
            { title: "IBM - Neural Networks", uri: "https://www.ibm.com/cloud/learn/neural-networks" },
            { title: "MIT - Introduction to Neural Networks", uri: "https://www.mit.edu/~9.54/fall14/Classes/class10/class10.html" }
        ]
    },
    {
        topic: Topic.WELLBEING,
        title: "I benefici scientifici della meditazione Mindfulness",
        description: "Scopri come pochi minuti di mindfulness al giorno possono ridurre lo stress, migliorare la concentrazione e aumentare il benessere generale.",
        imageUrl: "https://images.unsplash.com/photo-1506126613408-4e61f3d3d18f?q=80&w=2070&auto=format&fit=crop",
        userQuestions: [],
        tags: ["mindfulness", "salute", "psicologia"],
        suggestedQuestions: [
            "Come si inizia a praticare la mindfulness?",
            "Quali sono le evidenze scientifiche?",
            "Quanto tempo serve per vedere i benefici?"
        ],
        sources: [
            { title: "Healthline - Benefits of Meditation", uri: "https://www.healthline.com/nutrition/12-benefits-of-meditation" },
            { title: "Harvard Health - Mindfulness", uri: "https://www.health.harvard.edu/blog/mindfulness-meditation-may-ease-anxiety-mental-stress-201401086967" }
        ]
    },
    {
        topic: Topic.ART_DESIGN,
        title: "La storia nascosta dei colori nell'arte",
        description: "Dall'oltremare più prezioso dell'oro al viola imperiale: come i pigmenti hanno influenzato l'arte e la società attraverso i secoli.",
        imageUrl: "https://images.unsplash.com/photo-1541961017774-22349e4a1262?q=80&w=2058&auto=format&fit=crop",
        userQuestions: [],
        tags: ["arte", "storia", "colori"],
        suggestedQuestions: [
            "Perché il blu oltremare era così costoso?",
            "Come si ottenevano i colori nell'antichità?",
            "Qual è il significato simbolico dei colori nell'arte?"
        ],
        sources: [
            { title: "The History of Color in Art", uri: "https://www.metmuseum.org/toah/hd/pig/hd_pig.htm" },
            { title: "Pigments Through the Ages", uri: "https://www.webexhibits.org/pigments/" }
        ]
    },
    {
        topic: Topic.ECONOMY,
        title: "L'economia comportamentale e le decisioni irrazionali",
        description: "Perché gli esseri umani non prendono sempre decisioni economiche razionali e come questo influenza i mercati e la vita quotidiana.",
        imageUrl: "https://images.unsplash.com/photo-1559526324-4b87b5e36e44?q=80&w=2070&auto=format&fit=crop",
        userQuestions: [],
        tags: ["economia", "psicologia", "decisioni"],
        suggestedQuestions: [
            "Cos'è l'effetto di ancoraggio?",
            "Come influisce la perdita avversione?",
            "Quali sono i bias cognitivi più comuni?"
        ],
        sources: [
            { title: "Nobel Prize - Behavioral Economics", uri: "https://www.nobelprize.org/prizes/economic-sciences/2017/summary/" },
            { title: "Behavioral Economics Guide", uri: "https://www.behavioraleconomics.com/" }
        ]
    },
    {
        topic: Topic.SCIENCE_TECH,
        title: "Il mistero della materia oscura nell'universo",
        description: "Il 27% dell'universo è composto da materia oscura, ma cosa sappiamo realmente di questa sostanza invisibile che plasma la struttura cosmica?",
        imageUrl: "https://images.unsplash.com/photo-1446776653964-20c1d3a81b06?q=80&w=2071&auto=format&fit=crop",
        userQuestions: [],
        tags: ["spazio", "fisica", "cosmologia"],
        suggestedQuestions: [
            "Come sappiamo che la materia oscura esiste?",
            "Cosa la distingue dalla materia normale?",
            "Come cercano di rilevarla gli scienziati?"
        ],
        sources: [
            { title: "NASA - Dark Matter", uri: "https://science.nasa.gov/astrophysics/focus-areas/what-is-dark-energy" },
            { title: "CERN - Dark Matter", uri: "https://home.cern/science/physics/dark-matter" }
        ]
    },
    {
        topic: Topic.GENERAL_CULTURE,
        title: "Le biblioteche perdute della storia antica",
        description: "Dalla Biblioteca di Alessandria a quella di Baghdad: tesori di conoscenza perduti per sempre e il loro impatto sulla civilizzazione.",
        imageUrl: "https://images.unsplash.com/photo-1481627834876-b7833e8f5570?q=80&w=2086&auto=format&fit=crop",
        userQuestions: [],
        tags: ["storia", "cultura", "letteratura"],
        suggestedQuestions: [
            "Cosa conteneva la Biblioteca di Alessandria?",
            "Come sono andate perdute queste conoscenze?",
            "Quali scoperte potrebbero essere state dimenticate?"
        ],
        sources: [
            { title: "Britannica - Library of Alexandria", uri: "https://www.britannica.com/topic/Library-of-Alexandria" },
            { title: "Lost Libraries of the Ancient World", uri: "https://www.worldhistory.org/article/1682/the-library-of-alexandria/" }
        ]
    },
    {
        topic: Topic.WELLBEING,
        title: "Il potere rigenerativo del sonno",
        description: "Durante il sonno, il cervello si 'pulisce' dalle tossine e consolida i ricordi. Scopri i meccanismi nascosti di questo processo vitale.",
        imageUrl: "https://images.unsplash.com/photo-1541781774459-bb2af2f05b55?q=80&w=2086&auto=format&fit=crop",
        userQuestions: [],
        tags: ["salute", "neuroscienze", "sonno"],
        suggestedQuestions: [
            "Cosa succede al cervello durante il sonno?",
            "Perché sogniamo?",
            "Come migliorare la qualità del sonno?"
        ],
        sources: [
            { title: "Sleep Foundation", uri: "https://www.sleepfoundation.org/how-sleep-works" },
            { title: "NIH - Sleep Research", uri: "https://www.nhlbi.nih.gov/health/sleep" }
        ]
    }
];

const sampleUsers: Omit<User, 'id'>[] = [
    {
        firstName: "Brando",
        lastName: "Baldassarre",
        email: "brando.baldassarre@gmail.com",
        role: UserRole.ADMIN,
        permissions: getDefaultPermissions(UserRole.ADMIN),
        createdAt: new Date(),
        lastLoginAt: new Date()
    },
    {
        firstName: "Maria Jimena",
        lastName: "Herrera",
        email: "mjimenah@gmail.com",
        role: UserRole.MODERATOR,
        permissions: getDefaultPermissions(UserRole.MODERATOR),
        createdAt: new Date(),
        lastLoginAt: new Date()
    },
    {
        firstName: "Normal",
        lastName: "User",
        email: "ilbrando88@gmail.com",
        role: UserRole.USER,
        permissions: getDefaultPermissions(UserRole.USER),
        createdAt: new Date(),
        lastLoginAt: new Date()
    }
];

const sampleTopicSuggestions: Omit<TopicSuggestion, 'id'>[] = [
    {
        text: "Come funziona la fotosintesi clorofilliana e perché è fondamentale per la vita sulla Terra",
        tags: ["biologia", "fotosintesi", "piante", "ecologia"],
        createdBy: "admin-generated", // Simuliamo che sia stato creato da un admin
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date()
    },
    {
        text: "La storia e l'evoluzione del linguaggio: dalle prime forme di comunicazione alle lingue moderne",
        tags: ["linguistica", "storia", "comunicazione", "antropologia"],
        createdBy: "admin-generated",
        status: 'approved',
        createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 giorno fa
        updatedAt: new Date()
    },
    {
        text: "Blockchain e criptovalute: tecnologia rivoluzionaria o bolla speculativa?",
        tags: ["blockchain", "criptovalute", "tecnologia", "finanza", "bitcoin"],
        createdBy: "admin-generated",
        status: 'pending',
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 giorni fa
        updatedAt: new Date()
    },
    {
        text: "I benefici della musica sul cervello umano: neuroscienze e terapia musicale",
        tags: ["neuroscienze", "musica", "terapia", "cervello", "psicologia"],
        createdBy: "admin-generated",
        status: 'approved',
        createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 giorni fa
        updatedAt: new Date()
    },
    {
        text: "Architettura sostenibile: costruire il futuro rispettando l'ambiente",
        tags: ["architettura", "sostenibilità", "ambiente", "green building", "design"],
        createdBy: "admin-generated",
        status: 'converted',
        createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 giorni fa
        updatedAt: new Date()
    },
    {
        text: "L'intelligenza artificiale in medicina: diagnosi più precise e terapie personalizzate",
        tags: ["AI", "medicina", "diagnosi", "terapie", "tecnologia"],
        createdBy: "admin-generated",
        status: 'pending',
        createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 giorno fa
        updatedAt: new Date()
    }
];

async function seedDatabase() {
    console.log("🌱 Inizio il seeding del database Firestore...");

    try {
        // Seed Channels
        console.log("\n📺 Caricamento canali...");
        const channelsCollection = collection(db, 'channels');
        for (const channel of sampleChannels) {
            await addDoc(channelsCollection, channel);
            console.log(`✅ Canale "${channel.name}" ${channel.emoji} aggiunto.`);
        }
        console.log(`🎉 ${sampleChannels.length} canali caricati con successo.`);

        // Seed Gems
        console.log("\n💎 Caricamento gemme...");
        const gemsCollection = collection(db, 'gems');
        for (const gem of sampleGems) {
            await addDoc(gemsCollection, gem);
            console.log(`✅ Gemma "${gem.title}" aggiunta.`);
        }
        console.log(`🎉 ${sampleGems.length} gemme caricate con successo.`);

        // Seed Topic Suggestions
        console.log("\n💡 Caricamento argomenti di esempio...");
        const topicsCollection = collection(db, 'topicSuggestions');
        for (const topic of sampleTopicSuggestions) {
            await addDoc(topicsCollection, topic);
            console.log(`✅ Argomento "${topic.text.substring(0, 50)}..." (${topic.status}) aggiunto.`);
        }
        console.log(`🎉 ${sampleTopicSuggestions.length} argomenti caricati con successo.`);

        // Seed Users
        console.log("\n👥 Caricamento utenti di esempio...");
        const usersCollection = collection(db, 'users');
        for (const user of sampleUsers) {
            await addDoc(usersCollection, user);
            console.log(`✅ Utente "${user.firstName} ${user.lastName}" (${user.role}) aggiunto.`);
        }
        console.log(`🎉 ${sampleUsers.length} utenti caricati con successo.`);

        console.log("\n🚀 Seeding completato! Il tuo database ora contiene:");
        console.log(`   • ${sampleChannels.length} canali tematici`);
        console.log(`   • ${sampleGems.length} gemme di conoscenza`);
        console.log(`   • ${sampleUsers.length} utenti con ruoli diversi`);
        console.log(`   • ${sampleTopicSuggestions.length} argomenti da sviluppare`);
        console.log("\n👤 Utenti di esempio creati:");
        console.log("   • admin@curiow.com (Admin) - Accesso completo");
        console.log("   • moderator@curiow.com (Moderator) - Gestione contenuti");
        console.log("   • user@curiow.com (User) - Accesso base");
        console.log("\n💡 Ora puoi avviare la tua applicazione e vedere i dati in azione!");

    } catch (error) {
        console.error("❌ Errore durante il seeding del database:", error);
        console.log("\n🔧 Verifica che:");
        console.log("   • La configurazione Firebase sia corretta");
        console.log("   • Firestore sia abilitato nel progetto Firebase");
        console.log("   • Le regole di sicurezza permettano la scrittura");
    }
}

// Esegui il seeding
seedDatabase().then(() => {
    console.log("\n✨ Script terminato.");
}).catch((error) => {
    console.error("💥 Errore fatale:", error);
});
