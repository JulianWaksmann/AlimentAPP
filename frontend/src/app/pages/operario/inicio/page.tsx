import {redirect} from 'next/navigation';

export default function inicioOperario(){
    redirect('/pages/operario/inicio/ordenes-produccion-listas-para-produccion');
}

