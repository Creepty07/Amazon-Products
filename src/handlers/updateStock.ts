import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda"
import { badRequest, internalError, create, forbidden, notFound, ok } from "../lib/response";
import { GetCommand, PutCommand, QueryCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { dynamo } from "../lib/dynamodb";
import { v4 as uuidv4 } from "uuid";
import { Product } from "../types/product";

const PRODUCTS_TABLE = process.env.PRODUCTS_TABLE!;

export async function updateStock(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
    try {
        const productId = event.pathParameters?.id;

        if(!productId){
            return notFound("Producto no encontrado.")
        }

        const existing = await dynamo.send(
            new GetCommand({
                TableName: PRODUCTS_TABLE,
                Key: { productId }
            })
        )

        if(!existing.Item){
            return notFound("El producto no se encontro")
        }

        const body = JSON.parse(event.body ?? "{}");
        const { quantity } = body;

        if(quantity === undefined || typeof quantity !== "number" || !Number.isInteger(quantity) || quantity <= 0){
            return badRequest("El stock tiene que ser un valor positivo entero.")
        }

        if(existing.Item.stock < quantity){
            return badRequest("Insuficiente stock")
        }

        const now = new Date().toISOString();

        await dynamo.send(
            new UpdateCommand({
                TableName: PRODUCTS_TABLE,
                Key: { productId },
                UpdateExpression: "SET stock = stock  - :quantity, updatedAt = :updatedAt",
                ConditionExpression: "stock >= :quantity",
                ExpressionAttributeValues: { ":quantity"  : quantity, ":updatedAt": now }
            })
        )


        return ok({ message: "Stock actualizado exitosamente." })
    } catch (error) {
        console.error("Error en getUser: ", error);
        return internalError()
    }
}