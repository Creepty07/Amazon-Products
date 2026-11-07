import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda"
import { badRequest, internalError, create, forbidden, notFound, ok } from "../lib/response";
import { GetCommand, PutCommand, QueryCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { dynamo } from "../lib/dynamodb";
import { getCaller } from "../lib/caller";
import { v4 as uuidv4 } from "uuid";
import { Product } from "../types/product";

const PRODUCTS_TABLE = process.env.PRODUCTS_TABLE!;

export async function updateProduct(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
    try {
        // Conseguir el producto a actualizar
        const productId = event.pathParameters?.id;

        if (!productId) {
            return notFound("El producto no fue encontrado.");
        }

        const callerId = getCaller(event).userId;

        const existing = await dynamo.send(
            new GetCommand({ TableName: PRODUCTS_TABLE, Key: { productId } })
        )

        if (!existing.Item) {
            return notFound("El producto no fue encontrado")
        }

        if (existing.Item.sellerId !== callerId) {
            return forbidden("Solo puedes actualizar tus propios productos.")
        }

        const body = JSON.parse(event.body ?? "{}");

        const { name, description, price, stock } = body;

        if (!name || !description || !price || !stock) {
            return badRequest("Se requieren todos los elementos para crear un producto.");
        }

        if (typeof price !== "number" || price < 0) {
            return badRequest("El precio tiene que ser un numero y mayor a 0");
        }

        if (typeof stock !== "number" || stock < 0 || !Number.isInteger(stock)) {
            return badRequest("El stock debe ser un numero entero y debe ser mayor 0");
        }

        const now = new Date().toISOString();

        const updates: string[] = ["updatedAt = :updatedAt"];
        const expressionAttributeValues: Record<string, unknown> = { ":updatedAt": now }
        const expressionAttributeNames: Record<string, string> = {};

        if (name) {
            updates.push("#name = :name");
            expressionAttributeNames["#name"] = "name";
            expressionAttributeValues[":name"] = name;
        }
        if (description) {
            updates.push("description = :description");
            expressionAttributeValues[":description"] = description;
        }
        if (price !== undefined) {
            updates.push("price = :price");
            expressionAttributeValues[":price"] = price;
        }
        if (stock !== undefined) {
            updates.push("stock = :stock");
            expressionAttributeValues[":stock"] = stock;
        }

        await dynamo.send(
            new UpdateCommand({
                TableName: PRODUCTS_TABLE,
                Key: { productId },
                UpdateExpression: `SET ${updates.join(", ")}`,
                ExpressionAttributeValues: expressionAttributeValues,
                ...(Object.keys(expressionAttributeNames).length > 0 && {
                    ExpressionAttributeNames: expressionAttributeNames
                })
            })
        )
        return ok({ message: "Producto actualizado exitosamente." })
    } catch (error) {
        console.error("Error en getUser: ", error);
        return internalError()
    }
}