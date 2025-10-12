"use client";
import { getStockMateriaPrima } from "@/app/api/materiaPrima";
import Header from "@/app/components/Header";
import { MateriaPrima } from "@/app/models/MateriaPrima";
import { useEffect, useState } from "react";
import StockMateriaPrimaTable from "@/app/components/StockMateriaPrimaTable";

const StockMateriaPrimaPage = () => {
    const [stock, setStock] = useState<MateriaPrima[]>([]);

    useEffect(() => {
        const fetchStock = async () => {
            const res = await getStockMateriaPrima();
            setStock(res);
        };

        fetchStock();
    }, []);
        
    return (
        <div>
            <Header />
            <h1 className="text-2xl font-bold mb-4 text-center">Stock de Materia Prima</h1>
            <StockMateriaPrimaTable materiasPrimas={stock} />
        </div>
    );
};

export default StockMateriaPrimaPage;
