// const inicioVendedor = () => {
//     return(
//         <div>vendedores</div>
//     );
// };
import {redirect} from 'next/navigation';

export default function inicioVendedor(){
    redirect('/pages/vendedor/inicio/gestion-ventas');
}