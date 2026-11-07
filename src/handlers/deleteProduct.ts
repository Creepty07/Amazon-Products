import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda"
import { internalError,  forbidden, notFound, ok } from "../lib/response";
import { DeleteCommand, GetCommand } from "@aws-sdk/lib-dynamodb";
import { dynamo } from "../lib/dynamodb";
import { getCaller } from "../lib/caller";

const PRODUCTS_TABLE = process.env.PRODUCTS_TABLE!;

export async function deleteProduct(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
    try {
        const productId = event.pathParameters?.id;

        if (!productId) {
            return notFound("El producto no existe.")
        }

        const callerId = getCaller(event).userId;

        const existing = await dynamo.send(
            new GetCommand({ TableName: PRODUCTS_TABLE, Key: { productId } })
        )

        if (!existing.Item) {
            return notFound("Producto no encontrado")
        }

        if(existing.Item.sellerId !== callerId){
            return forbidden("Solo puedes borrar productos que tu hayas creado.")
        }

        await dynamo.send(
            new DeleteCommand({ TableName:PRODUCTS_TABLE, Key: {productId} })
        )

        return ok({ message: "Producto borrado exitosamente." })
    } catch (error) {
        console.error("Error en getUser: ", error);
        return internalError()
    }
}