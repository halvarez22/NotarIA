import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { createServiceClient } from '@/utils/supabase/service'

export async function POST(request: Request) {
  try {
    // Verificamos auth con el cliente de usuario
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const { storage_path } = body

    if (!storage_path) {
      return NextResponse.json({ error: 'storage_path es requerido' }, { status: 400 })
    }

    // Usamos el Service Role Client para firmar la URL, asegurando que bypassamos 
    // reglas restrictivas temporales solo para generar el link de descarga
    const serviceClient = createServiceClient()
    
    // Generar Signed URL (caduca en 15 minutos = 900 segundos)
    const { data, error } = await serviceClient.storage
      .from('expedientes')
      .createSignedUrl(storage_path, 900)

    if (error) {
      console.error("Signed URL Error:", error)
      return NextResponse.json({ error: 'No se pudo generar el enlace de descarga' }, { status: 500 })
    }

    return NextResponse.json({ signedUrl: data.signedUrl })

  } catch (error: any) {
    console.error("Download API Error:", error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
