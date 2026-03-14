from __future__ import annotations

try:
    import tkinter as tk
    from tkinter import ttk
except Exception:  # pragma: no cover - depende del runtime del sistema
    tk = None
    ttk = None


class SerialPortDialog:
    def __init__(self, load_ports, error_message=None):
        if tk is None or ttk is None:
            raise RuntimeError("Tkinter no esta disponible en este entorno.")

        self.load_ports = load_ports
        self.error_message = error_message
        self.selected_port = None
        self.port_by_row = {}

        self.root = tk.Tk()
        self.root.title("Seleccionar puerto serial")
        self.root.resizable(False, False)
        self.root.protocol("WM_DELETE_WINDOW", self.cancel)

        self.status_var = tk.StringVar()
        self.error_var = tk.StringVar()

        self._build_ui()
        self._load_port_rows()
        self._center_window()
        self.root.after(50, self._focus_dialog)

    def _build_ui(self):
        frame = ttk.Frame(self.root, padding=16)
        frame.grid(row=0, column=0, sticky="nsew")

        title = ttk.Label(
            frame,
            text="No fue posible detectar el viscosimetro automaticamente.",
            font=("Segoe UI", 11, "bold"),
        )
        title.grid(row=0, column=0, columnspan=2, sticky="w")

        subtitle = ttk.Label(
            frame,
            text=(
                "Seleccione con el mouse el puerto serial donde aparece el dispositivo "
                "y luego haga clic en Aceptar."
            ),
            wraplength=700,
            justify="left",
        )
        subtitle.grid(row=1, column=0, columnspan=2, sticky="w", pady=(6, 10))

        error_label = ttk.Label(
            frame,
            textvariable=self.error_var,
            foreground="#b42318",
            wraplength=700,
            justify="left",
        )
        error_label.grid(row=2, column=0, columnspan=2, sticky="w", pady=(0, 12))

        columns = ("device", "description", "manufacturer")
        self.tree = ttk.Treeview(
            frame,
            columns=columns,
            show="headings",
            selectmode="browse",
            height=10,
        )
        self.tree.heading("device", text="Puerto")
        self.tree.heading("description", text="Descripcion")
        self.tree.heading("manufacturer", text="Fabricante")
        self.tree.column("device", width=120, anchor="w")
        self.tree.column("description", width=380, anchor="w")
        self.tree.column("manufacturer", width=180, anchor="w")
        self.tree.grid(row=3, column=0, sticky="nsew")
        self.tree.bind("<<TreeviewSelect>>", self._on_selection_changed)
        self.tree.bind("<Double-1>", self._accept_if_possible)

        scrollbar = ttk.Scrollbar(frame, orient="vertical", command=self.tree.yview)
        scrollbar.grid(row=3, column=1, sticky="ns")
        self.tree.configure(yscrollcommand=scrollbar.set)

        status = ttk.Label(
            frame,
            textvariable=self.status_var,
            wraplength=700,
            justify="left",
        )
        status.grid(row=4, column=0, columnspan=2, sticky="w", pady=(10, 14))

        button_row = ttk.Frame(frame)
        button_row.grid(row=5, column=0, columnspan=2, sticky="e")

        refresh_button = ttk.Button(button_row, text="Actualizar lista", command=self._load_port_rows)
        refresh_button.grid(row=0, column=0, padx=(0, 8))

        cancel_button = ttk.Button(button_row, text="Cancelar", command=self.cancel)
        cancel_button.grid(row=0, column=1, padx=(0, 8))

        self.accept_button = ttk.Button(button_row, text="Aceptar", command=self.accept)
        self.accept_button.grid(row=0, column=2)

        frame.columnconfigure(0, weight=1)
        self.root.columnconfigure(0, weight=1)
        self.root.rowconfigure(0, weight=1)

    def _focus_dialog(self):
        self.root.lift()
        self.root.focus_force()
        self.tree.focus_set()

    def _center_window(self):
        self.root.update_idletasks()
        width = 740
        height = 420
        screen_width = self.root.winfo_screenwidth()
        screen_height = self.root.winfo_screenheight()
        x = max((screen_width - width) // 2, 0)
        y = max((screen_height - height) // 2, 0)
        self.root.geometry(f"{width}x{height}+{x}+{y}")

    def _load_port_rows(self):
        self.port_by_row.clear()
        for row_id in self.tree.get_children():
            self.tree.delete(row_id)

        ports = list(self.load_ports())
        preferred_row = None

        for index, port in enumerate(ports):
            row_id = str(index)
            description = port.description
            if port.preferred:
                description = f"{description} (detectado automaticamente)"
            manufacturer = port.manufacturer or "-"
            self.tree.insert(
                "",
                "end",
                iid=row_id,
                values=(port.device, description, manufacturer),
            )
            self.port_by_row[row_id] = port.device
            if port.preferred and preferred_row is None:
                preferred_row = row_id

        if ports:
            selected_row = preferred_row or "0"
            self.tree.selection_set(selected_row)
            self.tree.focus(selected_row)
            self.tree.see(selected_row)
            self.accept_button.configure(state="normal")
            self.status_var.set(
                "Si el puerto no aparece, verifique la conexion USB y haga clic en Actualizar lista."
            )
        else:
            self.accept_button.configure(state="disabled")
            self.status_var.set(
                "No se encontraron puertos seriales disponibles. Conecte el equipo y actualice la lista."
            )

        if self.error_message:
            self.error_var.set(f"Detalle: {self.error_message}")
        else:
            self.error_var.set("")

    def _on_selection_changed(self, _event=None):
        has_selection = bool(self.tree.selection())
        self.accept_button.configure(state="normal" if has_selection else "disabled")

    def _accept_if_possible(self, _event=None):
        if self.tree.selection():
            self.accept()

    def accept(self):
        selection = self.tree.selection()
        if not selection:
            return
        self.selected_port = self.port_by_row.get(selection[0])
        self.root.destroy()

    def cancel(self):
        self.selected_port = None
        self.root.destroy()

    def show(self):
        self.root.mainloop()
        return self.selected_port


def prompt_for_serial_port(load_ports, error_message=None):
    dialog = SerialPortDialog(load_ports=load_ports, error_message=error_message)
    return dialog.show()
