const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../bd'); // asegúrate que la ruta es correcta según tu estructura

// Ruta para el registro extendido
router.post('/register', async (req, res) => {
    const {
        nombre,
        segundo_nombre,
        apellido_paterno,
        apellido_materno,
        email,
        password,
        confirmarPassword
    } = req.body;

    // Validación básica en el backend
    if (!nombre || !apellido_paterno || !apellido_materno || !email || !password || !confirmarPassword) {
        return res.status(400).json({ message: "Todos los campos obligatorios deben llenarse." });
    }

    // Validar que la contraseña y su confirmación coincidan
    if (password !== confirmarPassword) {
        return res.status(400).json({ message: "Las contraseñas no coinciden." });
    }

    // Opcional: puedes agregar validaciones de formato aquí

    try {
        // Hash de la contraseña
        const hashed = await bcrypt.hash(password, 10);

        // Insertar usuario en la base de datos
        db.query(
            'INSERT INTO usuarios (nombre, segundo_nombre, apellido_paterno, apellido_materno, email, password) VALUES (?, ?, ?, ?, ?, ?)',
            [nombre, segundo_nombre, apellido_paterno, apellido_materno, email, hashed],
            (err, result) => {
                if (err) {
                    if (err.code === 'ER_DUP_ENTRY') {
                        return res.status(400).json({ message: "El correo ya está registrado." });
                    }
                    console.log('Error al registrar al usuario', err);
                    return res.status(500).json({ message: 'Error al registrar' });
                }
                console.log("Usuario registrado con el ID", result.insertId);
                res.status(200).json({ message: 'Usuario Registrado' });
            }
        );
    } catch (error) {
        console.log('Error en el servidor al momento de registrar: ', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
});

// Login de usuario
router.post('/login', (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ message: "Email y contraseña son requeridos." });
    }

    db.query('SELECT * FROM usuarios WHERE email = ?', [email], async (err, result) => {
        if (err) {
            console.log('Error en la consulta del login: ', err);
            return res.status(500).json({ message: 'Error en el servidor' });
        }

        if (result.length === 0) {
            return res.status(401).json({ message: 'Credenciales inválidas' });
        }

        const user = result[0];
        const valid = await bcrypt.compare(password, user.password);

        if (!valid) {
            return res.status(401).json({ message: 'Contraseña incorrecta, usuario no autorizado' });
        }

        // El payload puede incluir solo lo necesario
        const token = jwt.sign(
            { 
                id: user.id, 
                email: user.email,
                nombre: user.nombre,
                apellido_paterno: user.apellido_paterno
            },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );
        res.json({ 
            token,
            user: {
                id: user.id,
                nombre: user.nombre,
                segundo_nombre: user.segundo_nombre,
                apellido_paterno: user.apellido_paterno,
                apellido_materno: user.apellido_materno,
                email: user.email
            }
        });
    });
});

module.exports = router;
