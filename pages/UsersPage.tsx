import React from 'react';
import { UsersTable } from '@/components/users-table';

function UsersPage() {
  return (
    <div>
      <h2>ניהול משתמשים</h2>
      <p>הדף לניהול משתמשים נמצא כעת בפיתוח.</p>
        <UsersTable />
      <table>
        <tbody>
        <tr>
            <td><button>הוספה</button></td>
            <td><button>מחיקה</button></td>
            <td><button>עריכה</button></td>

        </tr>
        </tbody>
      </table>
    </div>
  );
}

export default UsersPage;