export interface Producto {
  id: string;
  nombre: string;
  categoria: string | null;
  marca: string | null;
  genero: string | null;
  presentacion: string | null;
  precio_compra: number;
  costo_agencia: number;
  porcentaje_ganancia: number;
  stock: number;
  imagen_url: string | null;
  observaciones: string | null;
  precio_venta: number | null;
  creado_en: string;
}

export function precioVenta(p: Pick<Producto, 'precio_compra' | 'porcentaje_ganancia'>): number {
  // precio_compra = costo promedio ponderado puesto en bodega (compra + agencia, por unidad).
  // Fórmula: costo * (1 + porcentaje / 100), redondeado al múltiplo de C$ 50 más cercano.
  const costo = Number(p.precio_compra) || 0;
  const porcentaje = Number(p.porcentaje_ganancia) || 0;
  const raw = costo * (1 + porcentaje / 100);
  const redondeado = Math.round(raw / 50) * 50;
  // Evita que un producto barato quede en C$ 0 por el redondeo.
  return raw > 0 && redondeado === 0 ? 50 : redondeado;
}

export interface Cliente {
  id: string;
  nombre: string;
  telefono: string | null;
  email: string | null;
  direccion: string | null;
  credito_autorizado: number;
  creado_en: string;
}

export interface Venta {
  id: string;
  cliente_id: string | null;
  fecha: string;
  total: number;
  tipo_pago: 'contado' | 'credito';
  estado: 'pagada' | 'pendiente' | 'cancelada';
  creado_en: string;
  cliente?: Cliente | null;
}

export interface DetalleVenta {
  id: string;
  venta_id: string;
  producto_id: string;
  cantidad: number;
  precio_unitario: number;
  costo_unitario: number;
  subtotal: number;
  producto?: Producto | null;
}

export interface Abono {
  id: string;
  venta_id: string;
  cliente_id: string;
  monto: number;
  fecha: string;
  creado_en: string;
  venta?: Venta | null;
  cliente?: Cliente | null;
}

export interface CompraInventario {
  id: string;
  producto_id: string;
  cantidad: number;
  costo_total: number;
  gasto_agencia: number;
  fecha: string;
  estado: 'en_proceso' | 'recibido';
  creado_en: string;
  producto?: Producto | null;
}

export interface CajaNegocio {
  id: string;
  concepto: string;
  monto: number;
  tipo: 'ingreso' | 'egreso';
  fecha: string;
  creado_en: string;
}
