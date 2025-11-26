# Naguara_Proyect
Sistema de facturacion compra y venta personalizado Polleria_Naguara


Para ejecutar el proyecto necesitas:
1- Tener la base de Datos actualizada (importar la ultima base de datos que te pasen)

2- Una vez tienes tu base de datos es postgresql entre los archivos de el proyecto entra a .env

3- en el .env Pon los datos de tu base de datos deberia ser los mismos menos la clave, que la clave 
es la que le pusiste al postgres al instalarlo

4- Ten en cuenta que el nombre de la base de datos tiene que ser: naguara_db, si no lo es cambia el
PGDATABASE=naguara_db por PGDATABASE="el nombre de tu BD"

5- Si ya tienes instalado node js entra en app.js en la carpeta de backend del proyecto y abre la terminal del vs

6-una vez con la terminal abierta ejecuta: (npm install express express-session cors dotenv pg bcrypt) y (npm install --save-dev nodemon)

7- una vez todos los pasos anteriores ejecuta : (npm run dev) si todo esta correcto deberia decirte: "🚀 Servidor API corriendo en http://localhost:3000
          ✅ Conexión exitosa a la base de datos PostgreSQL"

8- para entrar en el proyecto pon en tu navegador http://localhost:3000

9- El usuario para entrar seria user= admin password= 123456
