import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda"
import { internalError, ok } from "../lib/response";
import {  ScanCommand } from "@aws-sdk/lib-dynamodb";
import { dynamo } from "../lib/dynamodb";
import { withCors } from "../common/cors";

const PRODUCTS_TABLE = process.env.PRODUCTS_TABLE!;

async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
    try {
        const result = await dynamo.send(
            new ScanCommand({ TableName: PRODUCTS_TABLE })
        )
        return ok({ products: result.Items ?? []})
    } catch (error) {
        console.error("Error en getUser: ", error);
        return internalError()
    }
}

export const listAllProducts = withCors(handler);