"use client";
import GenerarTandaForm from "@/app/components/FormTandaProduccionManual";
import Header from "@/app/components/Header";
import React from "react";

const GenerarTandaPage = () => {
    return (
        <div>
            <Header />
            <h1 className="text-xxl font-bold text-center my-3">Generar Tanda de Producción Manualmente</h1>
            <div>
                <GenerarTandaForm />
            </div>
        </div>
    );
};

export default GenerarTandaPage;