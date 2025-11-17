import { useState } from "react";
import { User, Plus, Trash2, Key, Eye, EyeOff, Shield, Users } from "lucide-react";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./ui/dialog";
import { Alert, AlertDescription } from "./ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";

interface UserManagementProps {
  currentUser: {
    username: string;
    role: string;
  } | null | undefined; // <- Esto permite que sea undefined
}

interface SystemUser {
  id: number;
  username: string;
  role: string;
  lastLogin: string;
  status: 'active' | 'inactive';
}

export function UserManagement({ currentUser }: UserManagementProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [users, setUsers] = useState<SystemUser[]>([
    { id: 1, username: 'admin', role: 'Administrador', lastLogin: '2024-12-20 09:30', status: 'active' },
    { id: 2, username: 'operator1', role: 'Operador', lastLogin: '2024-12-19 14:15', status: 'active' },
    { id: 3, username: 'analyst', role: 'Analista', lastLogin: '2024-12-18 11:45', status: 'active' },
  ]);

  // Change Password States
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Add User States
  const [newUsername, setNewUsername] = useState('');
  const [newUserRole, setNewUserRole] = useState('Operador');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [showNewUserPassword, setShowNewUserPassword] = useState(false);

  // General States
  const [message, setMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

  const isAdmin = currentUser?.role === 'Administrador';

  const handleChangePassword = () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      setMessage({type: 'error', text: 'Todos los campos son requeridos'});
      return;
    }

    if (newPassword !== confirmPassword) {
      setMessage({type: 'error', text: 'Las contraseñas no coinciden'});
      return;
    }

    if (newPassword.length < 4) {
      setMessage({type: 'error', text: 'La contraseña debe tener al menos 4 caracteres'});
      return;
    }

    // Simulate password change
    setMessage({type: 'success', text: 'Contraseña cambiada exitosamente'});
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    
    setTimeout(() => setMessage(null), 3000);
  };

  const handleAddUser = () => {
    if (!newUsername || !newUserPassword) {
      setMessage({type: 'error', text: 'Nombre de usuario y contraseña son requeridos'});
      return;
    }

    if (users.some(u => u.username === newUsername)) {
      setMessage({type: 'error', text: 'El nombre de usuario ya existe'});
      return;
    }

    if (newUserPassword.length < 4) {
      setMessage({type: 'error', text: 'La contraseña debe tener al menos 4 caracteres'});
      return;
    }

    const newUser: SystemUser = {
      id: Math.max(...users.map(u => u.id)) + 1,
      username: newUsername,
      role: newUserRole,
      lastLogin: 'Nunca',
      status: 'active'
    };

    setUsers([...users, newUser]);
    setMessage({type: 'success', text: `Usuario '${newUsername}' agregado exitosamente`});
    
    // Reset form
    setNewUsername('');
    setNewUserPassword('');
    setNewUserRole('Operador');
    
    setTimeout(() => setMessage(null), 3000);
  };

  const handleDeleteUser = (userId: number) => {
    const userToDelete = users.find(u => u.id === userId);
    if (!userToDelete) return;

    if (userToDelete.username === currentUser?.username) {
      setMessage({type: 'error', text: 'No puedes eliminar tu propio usuario'});
      setTimeout(() => setMessage(null), 3000);
      return;
    }

    setUsers(users.filter(u => u.id !== userId));
    setMessage({type: 'success', text: `Usuario '${userToDelete.username}' eliminado exitosamente`});
    setDeleteConfirm(null);
    
    setTimeout(() => setMessage(null), 3000);
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="group bg-card border-2 border-border rounded-3xl p-6 hover:border-primary/30 hover:shadow-lg transition-all duration-200 w-full flex items-center justify-center space-x-4"
      >
        <div className="p-3 bg-purple-100 dark:bg-purple-900/20 rounded-2xl group-hover:bg-purple-200 dark:group-hover:bg-purple-900/40 transition-colors">
          <Users className="h-8 w-8 text-purple-600 dark:text-purple-400" />
        </div>
        <div className="text-center">
          <h3 className="text-lg font-medium">Gestión de Usuarios</h3>
          <p className="text-sm text-muted-foreground">
            {isAdmin ? 'Administrar usuarios y contraseñas' : 'Cambiar contraseña'}
          </p>
        </div>
      </button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <Users className="h-5 w-5" />
              <span>Gestión de Usuarios</span>
            </DialogTitle>
            <DialogDescription>
              Configure contraseñas y administre usuarios del sistema
            </DialogDescription>
          </DialogHeader>

          {message && (
            <Alert className={message.type === 'success' ? 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950' : 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950'}>
              <AlertDescription className={message.type === 'success' ? 'text-green-800 dark:text-green-200' : 'text-red-800 dark:text-red-200'}>
                {message.text}
              </AlertDescription>
            </Alert>
          )}

          <Tabs defaultValue="password" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="password" className="flex items-center space-x-2">
                <Key className="h-4 w-4" />
                <span>Cambiar Contraseña</span>
              </TabsTrigger>
              {isAdmin && (
                <TabsTrigger value="manage" className="flex items-center space-x-2">
                  <Shield className="h-4 w-4" />
                  <span>Administrar Usuarios</span>
                </TabsTrigger>
              )}
            </TabsList>

            {/* Change Password Tab */}
            <TabsContent value="password" className="space-y-4">
              <div className="space-y-4">
                <h4 className="font-medium">Cambiar Contraseña</h4>
                
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Contraseña Actual</label>
                    <div className="relative mt-1">
                      <input
                        type={showCurrentPassword ? "text" : "password"}
                        placeholder="Ingrese contraseña actual"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        className="w-full p-3 border border-border rounded-lg bg-input-background pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium">Nueva Contraseña</label>
                    <div className="relative mt-1">
                      <input
                        type={showNewPassword ? "text" : "password"}
                        placeholder="Ingrese nueva contraseña"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="w-full p-3 border border-border rounded-lg bg-input-background pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium">Confirmar Nueva Contraseña</label>
                    <div className="relative mt-1">
                      <input
                        type={showConfirmPassword ? "text" : "password"}
                        placeholder="Confirme nueva contraseña"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full p-3 border border-border rounded-lg bg-input-background pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <Button onClick={handleChangePassword} className="w-full">
                    <Key className="h-4 w-4 mr-2" />
                    Cambiar Contraseña
                  </Button>
                </div>
              </div>
            </TabsContent>

            {/* Manage Users Tab - Only for Admin */}
            {isAdmin && (
              <TabsContent value="manage" className="space-y-6">
                {/* Add New User */}
                <div className="space-y-4">
                  <h4 className="font-medium">Agregar Nuevo Usuario</h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium">Nombre de Usuario</label>
                      <input
                        type="text"
                        placeholder="Ingrese nombre de usuario"
                        value={newUsername}
                        onChange={(e) => setNewUsername(e.target.value)}
                        className="w-full mt-1 p-3 border border-border rounded-lg bg-input-background"
                      />
                    </div>

                    <div>
                      <label className="text-sm font-medium">Rol</label>
                      <select
                        value={newUserRole}
                        onChange={(e) => setNewUserRole(e.target.value)}
                        className="w-full mt-1 p-3 border border-border rounded-lg bg-input-background"
                      >
                        <option value="Operador">Operador</option>
                        <option value="Analista">Analista</option>
                        <option value="Administrador">Administrador</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium">Contraseña</label>
                    <div className="relative mt-1">
                      <input
                        type={showNewUserPassword ? "text" : "password"}
                        placeholder="Ingrese contraseña para el usuario"
                        value={newUserPassword}
                        onChange={(e) => setNewUserPassword(e.target.value)}
                        className="w-full p-3 border border-border rounded-lg bg-input-background pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewUserPassword(!showNewUserPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showNewUserPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <Button onClick={handleAddUser} className="w-full">
                    <Plus className="h-4 w-4 mr-2" />
                    Agregar Usuario
                  </Button>
                </div>

                {/* Users List */}
                <div className="space-y-4">
                  <h4 className="font-medium">Usuarios del Sistema</h4>
                  
                  <div className="space-y-2">
                    {users.map((user) => (
                      <div key={user.id} className="flex items-center justify-between p-3 border border-border rounded-lg bg-muted/20">
                        <div className="flex items-center space-x-3">
                          <div className="p-2 bg-primary/10 rounded-lg">
                            <User className="h-4 w-4 text-primary" />
                          </div>
                          <div>
                            <div className="font-medium">{user.username}</div>
                            <div className="text-sm text-muted-foreground">
                              {user.role} • Último acceso: {user.lastLogin}
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            user.status === 'active' 
                              ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                              : 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                          }`}>
                            {user.status === 'active' ? 'Activo' : 'Inactivo'}
                          </span>
                          
                          {user.username !== currentUser?.username && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setDeleteConfirm(user.id)}
                              className="text-red-600 border-red-200 hover:bg-red-50 dark:text-red-400 dark:border-red-800 dark:hover:bg-red-900/20"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </TabsContent>
            )}
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      {deleteConfirm && (
        <Dialog open={true} onOpenChange={() => setDeleteConfirm(null)}>
          <DialogContent className="sm:max-w-[400px]">
            <DialogHeader>
              <DialogTitle>Confirmar Eliminación</DialogTitle>
              <DialogDescription>
                Esta acción eliminará permanentemente el usuario seleccionado
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-muted-foreground">
                ¿Está seguro de que desea eliminar al usuario '{users.find(u => u.id === deleteConfirm)?.username}'?
              </p>
              <p className="text-sm text-red-600 dark:text-red-400">
                Esta acción no se puede deshacer.
              </p>
              <div className="flex space-x-2">
                <Button 
                  variant="outline" 
                  onClick={() => setDeleteConfirm(null)}
                  className="flex-1"
                >
                  Cancelar
                </Button>
                <Button 
                  variant="destructive" 
                  onClick={() => handleDeleteUser(deleteConfirm)}
                  className="flex-1"
                >
                  Eliminar
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}