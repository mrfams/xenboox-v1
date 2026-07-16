import {
  Html,
  Body,
  Container,
  Heading,
  Text,
  Section,
  Tailwind,
} from "@react-email/components"

type EmployeeCreatedProps = {
  employeeName: string
  employeeNumber: string
  department?: string
  jobTitle?: string
  hireDate: string
  basicSalary: string
  currency: string
  entityName: string
}

export function EmployeeCreatedEmail(props: EmployeeCreatedProps) {
  return (
    <Html>
      <Tailwind>
        <Body className="bg-gray-50 font-sans">
          <Container className="mx-auto py-8 px-4 max-w-2xl">
            <Heading className="text-2xl font-bold text-gray-900 mb-4">
              New Employee Added
            </Heading>
            <Text className="text-gray-600 mb-6">
              {props.entityName}
            </Text>

            <Section className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
              <Heading as="h2" className="text-lg font-semibold text-gray-900 mb-4">
                Employee Details
              </Heading>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <Text className="text-gray-600 m-0">Name</Text>
                  <Text className="font-semibold text-gray-900 m-0">{props.employeeName}</Text>
                </div>
                <div className="flex justify-between">
                  <Text className="text-gray-600 m-0">Employee #</Text>
                  <Text className="font-semibold text-gray-900 m-0">{props.employeeNumber}</Text>
                </div>
                {props.department && (
                  <div className="flex justify-between">
                    <Text className="text-gray-600 m-0">Department</Text>
                    <Text className="font-semibold text-gray-900 m-0">{props.department}</Text>
                  </div>
                )}
                {props.jobTitle && (
                  <div className="flex justify-between">
                    <Text className="text-gray-600 m-0">Job Title</Text>
                    <Text className="font-semibold text-gray-900 m-0">{props.jobTitle}</Text>
                  </div>
                )}
                <div className="flex justify-between">
                  <Text className="text-gray-600 m-0">Hire Date</Text>
                  <Text className="font-semibold text-gray-900 m-0">{props.hireDate}</Text>
                </div>
                <div className="flex justify-between">
                  <Text className="text-gray-600 m-0">Basic Salary</Text>
                  <Text className="font-bold text-green-600 m-0">{props.currency} {props.basicSalary}</Text>
                </div>
              </div>
            </Section>

            <Text className="text-gray-500 text-sm mt-8 text-center">
              This notification was sent by Xenboox AI Accounting
            </Text>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  )
}

EmployeeCreatedEmail.PreviewProps = {
  employeeName: "John Doe",
  employeeNumber: "EMP-001",
  department: "Finance",
  jobTitle: "Accountant",
  hireDate: "2026-07-15",
  basicSalary: "25,000",
  currency: "GMD",
  entityName: "Xenboox Demo",
} satisfies EmployeeCreatedProps
