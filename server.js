const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const path = require('path');

const app = express();
const PORT = 3000;

const users = {
    "misi": {
        password: "024asd",
        permissions: [
            { name: "MiNiPi music", url: "/6" },
            { name: "MiNi-mail", url: "/8" },
            { name: "MiNiPi game", url: "/2" }
        ]
    },
    "Beni": {
        password: "minipi2025",
        permissions: [
            { name: "MiNiPi music", url: "/6" },
            { name: "MiNi-mail", url: "/8" },
            { name: "MiNiPi game", url: "/2" }
        ]
    },
    "Anna": {
        password: "roblox",
        permissions: [
            { name: "MiNiPi game", url: "/2" }
        ]
    },
    "Bence": {
        password: "roblox1",
        permissions: [
            { name: "MiNiPi game", url: "/2" }
        ]
    },
    "Dorka": {
        password: "2015106",
        permissions: [
            { name: "MiNiPi game", url: "/2" }
        ]
    },
    "Csani": {
        password: "2016",
        permissions: [
            { name: "MiNiPi game", url: "/2" }
        ]
    },
    "Boti": {
        password: "beri01",
        permissions: [
            { name: "MiNiPi game", url: "/2" }
        ]
    },
    "Dóri": {
        password: "cuki uszkár",
        permissions: [
            { name: "MiNiPi game", url: "/2" }
        ]
    },
    "Dóra": {
        password: "2026",
        permissions: [
            { name: "MiNiPi game", url: "/2" }
        ]
    },
    "Zara": {
        password: "mogyoró",
        permissions: [
            { name: "MiNiPi game", url: "/2" }
        ]
    },
    "Szofi": {
        password: "Szofi20151212",
        permissions: [
            { name: "MiNiPi game", url: "/2" }
        ]
    },
    "Ilián": {
        password: "fi1",
        permissions: [
            { name: "MiNiPi game", url: "/2" }
        ]
    },
    "Zoja": {
        password: "1",
        permissions: [
            { name: "MiNiPi game", url: "/2" }
        ]
    },
    "Barnus": {
        password: "szar",
        permissions: [
            { name: "MiNiPi game", url: "/2" }
        ]
    },
    "Kornél": {
        password: "HEKKER 8000",
        permissions: [
            { name: "MiNiPi game", url: "/2" }
        ]
    },
    "Nati": {
        password: "212121",
        permissions: [
            { name: "MiNiPi game", url: "/2" }
        ]
    }, "Dórika": {
        password: "2015sznd",
        permissions: [
            { name: "MiNiPi game", url: "/2" }
        ]
    }, "Olivér": {
        password: "2",
        permissions: [
            { name: "MiNiPi game", url: "/2" }
        ]
    }, "Zalán": {
        password: "kutyuli200",
        permissions: [
            { name: "MiNiPi game", url: "/2" }
        ]
    }, "Zselyke": {
        password: "160211 Zselyke",
        permissions: [
            { name: "MiNiPi game", url: "/2" }
        ]
    }, "Iza": {
        password: "Iza boxerkutya",
        permissions: [
            { name: "MiNiPi game", url: "/2" }
        ]
    }, "Peti": {
        password: "3",
        permissions: [
            { name: "MiNiPi game", url: "/2" }
        ]
    }, "Hédi": {
        password: "hotdog",
        permissions: [
            { name: "MiNiPi game", url: "/2" }
        ]
    }, "Nusi": {
        password: "4",
        permissions: [
            { name: "MiNiPi game", url: "/2" }
        ]
    }, "Janka": {
        password: "5",
        permissions: [
            { name: "MiNiPi game", url: "/2" }
        ]
    }, "Bori": {
        password: "6",
        permissions: [
            { name: "MiNiPi game", url: "/2" }
        ]
    }, "Dávid": {
        password: "cr7",
        permissions: [
            { name: "MiNiPi game", url: "/2" }
        ]
    }

};
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static('public'));
app.use('/private', express.static('private'));
app.use(session({
    secret: 'titkos-kulcs-a-session-hez',
    resave: false,
    saveUninitialized: true
}));

app.get('/', (req, res) => {
    if (req.session.user) {
        res.sendFile(path.join(__dirname, 'public', 'main.html'));
    } else {
        res.redirect('/login');
    }
});

app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.post('/login', (req, res) => {
    const { username, password } = req.body;

    if (users[username] && users[username].password === password) {
        req.session.user = username;
        res.redirect('/');
    } else {
        res.redirect('/login?error=1');
    }
});
app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('login');
});
app.get('/user-permissions', (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ error: 'nincs bejelentkezve' });
    }

    const username = req.session.user;
    const permissions = users[username] ? users[username].permissions : [];

    res.json({ permissions });
});

app.get('/6', (req, res) => {
    if (!req.session.user) {
        return res.redirect('/login');
    }

    const username = req.session.user;
    const userPermissions = users[username] ? users[username].permissions : [];
    const hasPermission = userPermissions.some(p => p.url === '/6');

    if (hasPermission) {
        res.sendFile(path.join(__dirname, 'private', '6.html'));
    } else {
        res.redirect('/');
    }
})

app.get('/8', (req, res) => {
    if (!req.session.user) {
        return res.redirect('/login');
    }


    const username = req.session.user;
    const userPermissions = users[username] ? users[username].permissions : [];
    const hasPermission = userPermissions.some(p => p.url === '/8');

    if (hasPermission) {
        res.sendFile(path.join(__dirname, 'private', '8.html'));
    } else {
        res.redirect('/');
    }
})

app.get('/2', (req, res) => {
    if (!req.session.user) {
        return res.redirect('/login');
    }

    const username = req.session.user;
    const userPermissions = users[username] ? users[username].permissions : [];
    const hasPermission = userPermissions.some(p => p.url === '/2');

    if (hasPermission) {
        res.sendFile(path.join(__dirname, 'private', '2.html'));
    } else {
        res.redirect('/');
    }
}); app.listen(PORT, () => {
    console.log(`A szerver fut a http://localhost:${PORT} címen`)
})
