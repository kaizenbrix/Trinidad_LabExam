# MySQL setup

1. Start MySQL from the XAMPP Control Panel.
2. In phpMyAdmin, import `database.sql` (or run its contents in the SQL tab). This creates the `helpdesk` database and `tickets` table.
3. Copy `.env.example` to `.env` and enter the MySQL username and password configured on your machine.
4. From the project root, install backend dependencies and start the API:

   ```sh
   npm install --prefix backend
   npm run dev --prefix backend
   ```

The frontend uses the API at `http://localhost:3001/api`. The API's demo login is currently `itadmin` / `helpdesk123`; login credentials are hard-coded in the backend and are not stored in MySQL.
